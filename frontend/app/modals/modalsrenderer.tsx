// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { TermonWelcomeModal } from "@/app/onboarding/termon-welcome";
import { globalStore } from "@/app/store/jotaiStore";
import { atoms } from "@/store/global";
import { modalsModel } from "@/store/modalmodel";
import * as jotai from "jotai";
import { useEffect } from "react";
import { getModalComponent } from "./modalregistry";

const ModalsRenderer = () => {
    const [termonWelcomeOpen] = jotai.useAtom(modalsModel.termonWelcomeOpen);
    const [modals] = jotai.useAtom(modalsModel.modalsAtom);
    const rtn: React.ReactElement[] = [];
    for (const modal of modals) {
        const ModalComponent = getModalComponent(modal.displayName);
        if (ModalComponent) {
            rtn.push(<ModalComponent key={modal.displayName} {...modal.props} />);
        }
    }
    if (termonWelcomeOpen) {
        rtn.push(<TermonWelcomeModal key={TermonWelcomeModal.displayName} />);
    }
    useEffect(() => {
        modalsModel.maybeShowTermonWelcome();
    }, []);
    useEffect(() => {
        globalStore.set(atoms.modalOpen, rtn.length > 0);
    }, [rtn]);

    return <>{rtn}</>;
};

export { ModalsRenderer };
