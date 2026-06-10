// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import Logo from "@/app/asset/logo.svg";
import { Button } from "@/app/element/button";
import { KeyBinding } from "@/app/element/quicktips";
import { Modal } from "@/app/modals/modal";
import { disableGlobalKeybindings, enableGlobalKeybindings, globalRefocus } from "@/app/store/keymodel";
import { modalsModel } from "@/app/store/modalmodel";
import { isMacOS } from "@/util/platformutil";
import { useEffect } from "react";

const TermonWelcomeModal = () => {
    const isMac = isMacOS();
    const sshShortcut = isMac ? "Cmd:b" : "Ctrl:b";
    const sshShortcutLabel = isMac ? "Cmd+B" : "Ctrl+B";
    const prefsShortcut = isMac ? "Cmd:," : "Ctrl:,";
    const prefsShortcutLabel = isMac ? "Cmd+," : "Ctrl+,";

    useEffect(() => {
        disableGlobalKeybindings();
        return () => {
            enableGlobalKeybindings();
        };
    }, []);

    const handleDismiss = () => {
        modalsModel.dismissTermonWelcome();
        setTimeout(() => {
            globalRefocus();
        }, 10);
    };

    return (
        <Modal className="w-[480px] !p-[30px]" onClose={handleDismiss}>
            <div className="flex flex-col gap-6 w-full unselectable">
                <header className="flex flex-col items-center gap-3 text-center">
                    <Logo />
                    <div className="text-[25px] font-normal text-foreground">Welcome to Termon</div>
                    <p className="text-secondary leading-5">A few things to get you started:</p>
                </header>
                <ul className="flex flex-col gap-4 text-secondary leading-5">
                    <li className="flex items-start gap-3">
                        <i className="fa-solid fa-table-columns text-accent text-lg mt-0.5 flex-shrink-0" />
                        <span>
                            Use <span className="text-foreground font-medium">tabs</span> to switch between workspaces
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <i className="fa-solid fa-server text-[#2eff6a] text-lg mt-0.5 flex-shrink-0" />
                        <span className="flex flex-col gap-1.5">
                            <span>
                                Press <span className="text-foreground font-medium">{sshShortcutLabel}</span> to toggle
                                the SSH hosts panel
                            </span>
                            <KeyBinding keyDecl={sshShortcut} />
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <i className="fa-solid fa-sliders text-accent text-lg mt-0.5 flex-shrink-0" />
                        <span className="flex flex-col gap-1.5">
                            <span>
                                Press <span className="text-foreground font-medium">{prefsShortcutLabel}</span> for
                                preferences
                            </span>
                            <KeyBinding keyDecl={prefsShortcut} />
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <i className="fa-solid fa-grip-vertical text-accent text-lg mt-0.5 flex-shrink-0" />
                        <span>
                            Open the <span className="text-foreground font-medium">widget rail</span> on the left to add
                            new blocks
                        </span>
                    </li>
                </ul>
                <footer className="flex justify-center">
                    <Button className="font-[600] cursor-pointer" onClick={handleDismiss}>
                        Got it
                    </Button>
                </footer>
            </div>
        </Modal>
    );
};

TermonWelcomeModal.displayName = "TermonWelcomeModal";

export { TermonWelcomeModal };
