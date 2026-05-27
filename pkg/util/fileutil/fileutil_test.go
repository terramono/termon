package fileutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAtomicWriteFile(t *testing.T) {
	tmpDir := t.TempDir()
	fileName := filepath.Join(tmpDir, "settings.json")

	err := AtomicWriteFile(fileName, []byte(`{"key":"value"}`), 0644)
	if err != nil {
		t.Fatalf("AtomicWriteFile failed: %v", err)
	}

	data, err := os.ReadFile(fileName)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}
	if string(data) != `{"key":"value"}` {
		t.Fatalf("unexpected file contents: %q", string(data))
	}
	if _, err := os.Stat(fileName + TempFileSuffix); !os.IsNotExist(err) {
		t.Fatalf("temporary file should not exist, stat err: %v", err)
	}
}

func TestAtomicWriteFileRenameErrorCleansTempFile(t *testing.T) {
	tmpDir := t.TempDir()
	fileName := filepath.Join(tmpDir, "settings.json")

	if err := os.Mkdir(fileName, 0755); err != nil {
		t.Fatalf("Mkdir failed: %v", err)
	}

	err := AtomicWriteFile(fileName, []byte(`{"key":"value"}`), 0644)
	if err == nil {
		t.Fatalf("AtomicWriteFile expected error")
	}
	if _, statErr := os.Stat(fileName + TempFileSuffix); !os.IsNotExist(statErr) {
		t.Fatalf("temporary file should be removed on rename error, stat err: %v", statErr)
	}
}

func TestParseByteRange(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		wantAll bool
		wantErr bool
	}{
		{"empty means all", "", true, false},
		{"open ended", "100-", false, false},
		{"closed range", "0-99", false, false},
		{"invalid range", "abc", false, true},
		{"negative start", "-1-5", false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := ParseByteRange(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.All != tt.wantAll {
				t.Fatalf("All = %v, want %v", got.All, tt.wantAll)
			}
		})
	}

	closed, err := ParseByteRange("10-20")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if closed.Start != 10 || closed.End != 20 || closed.OpenEnd {
		t.Fatalf("unexpected closed range: %+v", closed)
	}
}

func TestIsInitScriptPath(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"absolute script", "/home/user/init.sh", true},
		{"home path", "~/scripts/init.sh", true},
		{"absolute etc", "/etc/myapp/init.sh", true},
		{"inline script", "echo hello; rm -rf /", false},
		{"system bin with flags", "/usr/bin/bash --login", false},
		{"empty", "", false},
		{"multiline", "line1\nline2", false},
		{"relative", "scripts/init.sh", false},
		{"system bin", "/usr/bin/bash", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := IsInitScriptPath(tt.input); got != tt.want {
				t.Fatalf("IsInitScriptPath(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestApplyEdits(t *testing.T) {
	t.Parallel()

	content := []byte("hello world")
	edited, err := ApplyEdits(content, []EditSpec{{OldStr: "world", NewStr: "wave"}})
	if err != nil {
		t.Fatalf("ApplyEdits failed: %v", err)
	}
	if string(edited) != "hello wave" {
		t.Fatalf("unexpected content: %q", string(edited))
	}

	_, err = ApplyEdits(content, []EditSpec{{OldStr: "missing", NewStr: "x"}})
	if err == nil {
		t.Fatal("expected error when old_str not found")
	}
}
