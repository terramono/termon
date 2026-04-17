// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { globalStore } from "@/app/store/jotaiStore";
import { atoms } from "@/store/global";
import { modalsModel } from "@/store/modalmodel";
import * as jotai from "jotai";
import { useEffect } from "react";
import { getModalComponent } from "./modalregistry";

// Termon fork: the upstream Wave "Welcome"/feature-tour/upgrade-notes modals
// were stripped out. We still render ad-hoc modals pushed via `modalsModel`
// (About, settings dialogs, etc.), but the first-launch and post-upgrade
// onboarding flows never trigger. ToS is left unset, which is fine because
// backend telemetry also gates on `tosagreed != 0` and therefore stays off.
const ModalsRenderer = () => {
    const [modals] = jotai.useAtom(modalsModel.modalsAtom);
    const rtn: React.ReactElement[] = [];
    for (const modal of modals) {
        const ModalComponent = getModalComponent(modal.displayName);
        if (ModalComponent) {
            rtn.push(<ModalComponent key={modal.displayName} {...modal.props} />);
        }
    }
    useEffect(() => {
        globalStore.set(atoms.modalOpen, rtn.length > 0);
    }, [rtn]);

    return <>{rtn}</>;
};

export { ModalsRenderer };
