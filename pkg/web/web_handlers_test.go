// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package web

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/wavetermdev/waveterm/pkg/authkey"
	"github.com/wavetermdev/waveterm/pkg/schema"
)

const testAuthKey = "test-auth-key-12345"

func setupTestAuth(t *testing.T) {
	t.Helper()
	t.Setenv(authkey.WaveAuthKeyEnv, testAuthKey)
	if err := authkey.SetAuthKeyFromEnv(); err != nil {
		t.Fatalf("SetAuthKeyFromEnv: %v", err)
	}
}

func authRequest(method, target string, body io.Reader) *http.Request {
	req := httptest.NewRequest(method, target, body)
	req.Header.Set(authkey.AuthKeyHeader, testAuthKey)
	return req
}

func newTestRouter() http.Handler {
	gr := mux.NewRouter()
	gr.HandleFunc("/wave/stream-local-file", WebFnWrap(WebFnOpts{AllowCaching: true}, handleStreamLocalFile))
	gr.HandleFunc("/wave/stream-file", WebFnWrap(WebFnOpts{AllowCaching: true}, handleStreamFile))
	gr.HandleFunc("/api/post-chat-message", WebFnWrap(WebFnOpts{AllowCaching: false}, handleAIPostMessageStub))
	waveRouter := mux.NewRouter()
	waveRouter.HandleFunc("/wave/file", WebFnWrap(WebFnOpts{AllowCaching: false}, handleWaveFile))
	waveRouter.HandleFunc("/wave/service", WebFnWrap(WebFnOpts{JsonErrors: true}, handleService))
	waveRouter.HandleFunc("/wave/aichat", WebFnWrap(WebFnOpts{JsonErrors: true, AllowCaching: false}, handleAIGetChatStub))
	vdomRouter := mux.NewRouter()
	vdomRouter.HandleFunc("/vdom/{uuid}/{path:.*}", WebFnWrap(WebFnOpts{AllowCaching: true}, handleVDom))
	gr.PathPrefix("/wave/").Handler(http.TimeoutHandler(waveRouter, HttpTimeoutDuration, "Timeout"))
	gr.PathPrefix("/vdom/").Handler(http.TimeoutHandler(vdomRouter, HttpTimeoutDuration, "Timeout"))
	gr.PathPrefix(schemaPrefix).Handler(http.StripPrefix(schemaPrefix, schema.GetSchemaHandler()))
	gr.HandleFunc("/ws", HandleWs)
	return gr
}

func handleAIPostMessageStub(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	WriteJsonSuccess(w, map[string]string{"status": "ok"})
}

func handleAIGetChatStub(w http.ResponseWriter, r *http.Request) {
	WriteJsonSuccess(w, map[string]string{"chat": "empty"})
}

func TestWebFnWrapAuthAndOptions(t *testing.T) {
	setupTestAuth(t)
	handler := WebFnWrap(WebFnOpts{AllowCaching: false}, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})

	rr := httptest.NewRecorder()
	handler(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("missing auth status = %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	handler(rr, authRequest(http.MethodOptions, "/", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("OPTIONS status = %d", rr.Code)
	}
	if rr.Header().Get(CacheControlHeaderKey) != CacheControlHeaderNoCache {
		t.Fatalf("cache header = %q", rr.Header().Get(CacheControlHeaderKey))
	}
}

func TestHandleService(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()

	tests := []struct {
		name       string
		method     string
		body       string
		auth       bool
		wantStatus int
	}{
		{"invalid method", http.MethodGet, `{}`, true, http.StatusMethodNotAllowed},
		{"invalid json", http.MethodPost, `{`, true, http.StatusBadRequest},
		{"invalid service", http.MethodPost, `{"service":"nope","method":"X","args":[]}`, true, http.StatusOK},
		{"unauthorized", http.MethodPost, `{}`, false, http.StatusUnauthorized},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var req *http.Request
			if tc.auth {
				req = authRequest(tc.method, "/wave/service", strings.NewReader(tc.body))
			} else {
				req = httptest.NewRequest(tc.method, "/wave/service", strings.NewReader(tc.body))
			}
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)
			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandleWaveFileValidation(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()

	tests := []struct {
		name       string
		query      string
		wantStatus int
	}{
		{"invalid zoneid", "zoneid=bad&name=file.txt", http.StatusBadRequest},
		{"missing name", "zoneid=" + uuid.NewString(), http.StatusBadRequest},
		{"invalid name", "zoneid=" + uuid.NewString() + "&name=../secrets", http.StatusBadRequest},
		{"not found", "zoneid=" + uuid.NewString() + "&name=missing.txt", http.StatusInternalServerError},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/file?"+tc.query, nil))
			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
			}
		})
	}
}

func TestHandleStreamLocalFile(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/stream-local-file", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("missing path status = %d", rr.Code)
	}

	home := t.TempDir()
	t.Setenv("HOME", home)
	filePath := filepath.Join(home, "hello.txt")
	if err := os.WriteFile(filePath, []byte("stream-me"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/stream-local-file?path="+filePath, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("stream existing status = %d body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "stream-me") {
		t.Fatalf("body = %q", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/stream-local-file?path="+filepath.Join(home, "missing.txt")+"&no404=1", nil))
	if rr.Code != http.StatusOK || rr.Header().Get("Content-Type") != "image/gif" {
		t.Fatalf("no404 status=%d type=%q", rr.Code, rr.Header().Get("Content-Type"))
	}
}

func TestHandleStreamFileValidation(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/stream-file", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("missing path status = %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/stream-file?path=wsh://local/nope", nil))
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("stream remote status = %d", rr.Code)
	}
}

func TestWriteJsonHelpers(t *testing.T) {
	rr := httptest.NewRecorder()
	WriteJsonError(rr, errTest("boom"))
	if rr.Code != http.StatusOK {
		t.Fatalf("WriteJsonError status = %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	WriteJsonSuccess(rr, map[string]int{"x": 1})
	if rr.Code != http.StatusOK {
		t.Fatalf("WriteJsonSuccess status = %d", rr.Code)
	}
}

func TestNotFoundBlockingResponseWriter(t *testing.T) {
	base := httptest.NewRecorder()
	rw := &notFoundBlockingResponseWriter{w: base, headers: http.Header{}}
	rw.WriteHeader(http.StatusNotFound)
	if _, err := rw.Write([]byte("hidden")); err != nil {
		t.Fatalf("Write 404: %v", err)
	}
	if base.Body.Len() != 0 {
		t.Fatalf("404 write should be blocked, body=%q", base.Body.String())
	}

	rw = &notFoundBlockingResponseWriter{w: base, headers: http.Header{}}
	if _, err := rw.Write([]byte("ok")); err != nil {
		t.Fatalf("Write implicit 200: %v", err)
	}
}

func TestHandleVDomValidation(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/vdom/not-a-uuid/path", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("invalid uuid status = %d", rr.Code)
	}
}

func TestSchemaAndAIChatEndpoints(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/schema/missing", nil))
	if rr.Code != http.StatusNotFound && rr.Code != http.StatusOK {
		t.Fatalf("schema status = %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/aichat", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("aichat status = %d body=%s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodPost, "/api/post-chat-message", strings.NewReader(`{}`)))
	if rr.Code != http.StatusOK {
		t.Fatalf("post-chat status = %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestHandleWsValidation(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/ws", nil))
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("missing stableid status = %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/ws?stableid=abc", nil))
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("missing auth status = %d", rr.Code)
	}
}

func TestWebFnWrapPanicJsonErrors(t *testing.T) {
	setupTestAuth(t)
	handler := WebFnWrap(WebFnOpts{JsonErrors: true}, func(http.ResponseWriter, *http.Request) {
		panic("test panic")
	})
	rr := httptest.NewRecorder()
	handler(rr, authRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("panic status = %d", rr.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal panic response: %v", err)
	}
	if payload["error"] == nil {
		t.Fatalf("panic response = %#v", payload)
	}
}

func TestCopyHeadersAndServeTransparentGIF(t *testing.T) {
	dst := http.Header{}
	src := http.Header{"X-Test": []string{"a", "b"}}
	copyHeaders(dst, src)
	if len(dst["X-Test"]) != 2 {
		t.Fatalf("copyHeaders = %#v", dst)
	}
	rr := httptest.NewRecorder()
	serveTransparentGIF(rr)
	if rr.Code != http.StatusOK || rr.Header().Get("Content-Type") != "image/gif" {
		t.Fatalf("serveTransparentGIF status=%d type=%q", rr.Code, rr.Header().Get("Content-Type"))
	}
}

func TestMakeTCPListener(t *testing.T) {
	ln, err := MakeTCPListener("test")
	if err != nil {
		t.Fatalf("MakeTCPListener: %v", err)
	}
	ln.Close()
}

func TestHandleWaveFileInvalidOffset(t *testing.T) {
	setupTestAuth(t)
	router := newTestRouter()
	zone := uuid.NewString()
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, authRequest(http.MethodGet, "/wave/file?zoneid="+zone+"&name=file.txt&offset=abc", nil))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("invalid offset status = %d", rr.Code)
	}
}

func TestHandleServiceReadBodyError(t *testing.T) {
	setupTestAuth(t)
	req := authRequest(http.MethodPost, "/wave/service", errReadCloser{})
	rr := httptest.NewRecorder()
	handleService(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("read body error status = %d", rr.Code)
	}
}

type errReadCloser struct{}

func (errReadCloser) Read([]byte) (int, error) { return 0, io.ErrUnexpectedEOF }
func (errReadCloser) Close() error            { return nil }

func TestMarshalReturnValueSerializeError(t *testing.T) {
	ch := make(chan int)
	payload := marshalReturnValue(ch, nil)
	if !bytes.Contains(payload, []byte("error")) {
		t.Fatalf("marshalReturnValue channel = %s", string(payload))
	}
	_ = time.Now()
}
