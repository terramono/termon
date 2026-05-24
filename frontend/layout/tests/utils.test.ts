// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { assert, test } from "vitest";
import { DropDirection, FlexDirection } from "../lib/types";
import { NavigateDirection } from "../lib/types";
import {
    determineDropDirection,
    getCenter,
    navigateDirectionToOffset,
    reverseFlexDirection,
    setTransform,
} from "../lib/utils";

test("determineDropDirection", () => {
    const dimensions: Dimensions = {
        top: 0,
        left: 0,
        height: 5,
        width: 5,
    };

    assert.equal(
        determineDropDirection(dimensions, {
            x: 2.5,
            y: 1.5,
        }),
        DropDirection.Top
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 2.5,
            y: 3.5,
        }),
        DropDirection.Bottom
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 3.5,
            y: 2.5,
        }),
        DropDirection.Right
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 1.5,
            y: 2.5,
        }),
        DropDirection.Left
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 2.5,
            y: 0.5,
        }),
        DropDirection.OuterTop
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 4.5,
            y: 2.5,
        }),
        DropDirection.OuterRight
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 2.5,
            y: 4.5,
        }),
        DropDirection.OuterBottom
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 0.5,
            y: 2.5,
        }),
        DropDirection.OuterLeft
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 2.5,
            y: 2.5,
        }),
        DropDirection.Center
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 2.51,
            y: 2.51,
        }),
        DropDirection.Center
    );

    assert.equal(
        determineDropDirection(dimensions, {
            x: 1.5,
            y: 1.5,
        }),
        undefined
    );
});

test("reverseFlexDirection", () => {
    assert.equal(reverseFlexDirection(FlexDirection.Row), FlexDirection.Column);
    assert.equal(reverseFlexDirection(FlexDirection.Column), FlexDirection.Row);
});

test("setTransform rounds dimensions and applies translate3d", () => {
    const style = setTransform({ top: 10.7, left: 5.2, width: 100.1, height: 50.9 }, true, true, 2);
    assert.equal(style.transform, "translate3d(5px,10px, 0)");
    assert.equal(style.width, "101px");
    assert.equal(style.height, "51px");
    assert.equal(style.zIndex, 2);
});

test("getCenter returns box center point", () => {
    const center = getCenter({ top: 10, left: 20, width: 100, height: 50 });
    assert.equal(center.x, 70);
    assert.equal(center.y, 35);
});

test("navigateDirectionToOffset maps directions to unit offsets", () => {
    assert.deepEqual(navigateDirectionToOffset(NavigateDirection.Up), { x: 0, y: -1 });
    assert.deepEqual(navigateDirectionToOffset(NavigateDirection.Down), { x: 0, y: 1 });
    assert.deepEqual(navigateDirectionToOffset(NavigateDirection.Left), { x: -1, y: 0 });
    assert.deepEqual(navigateDirectionToOffset(NavigateDirection.Right), { x: 1, y: 0 });
});
