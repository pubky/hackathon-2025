use dioxus::prelude::*;

#[derive(Props, Clone, PartialEq)]
pub struct TopbarProps {
    pub is_running: bool,
    pub is_creating_homeserver: bool,
    pub is_creating_client: bool,
    pub scenarios: Vec<String>,
    pub selected_scenario: Option<usize>,
    pub is_playing_scenario: bool,
    pub on_toggle_network: EventHandler<()>,
    pub on_add_homeserver: EventHandler<()>,
    pub on_add_client: EventHandler<()>,
    pub on_scenario_select: EventHandler<usize>,
    pub on_play_scenario: EventHandler<()>,
    pub on_reset: EventHandler<()>,
    pub on_import_scenario: EventHandler<()>,
    pub on_export_scenario: EventHandler<()>,
}

#[component]
pub fn Topbar(props: TopbarProps) -> Element {
    rsx! {
        div {
            class: "h-12 bg-black border-b border-zinc-800 flex items-center px-4",

            // Left side - Logo and status
            div {
                class: "flex items-center gap-3 flex-1",

                // Logo/Title
                h1 {
                    class: "text-base font-semibold text-white",
                    "Publar"
                }

                // Start/Stop button
                button {
                    class: if props.is_running {
                        "h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium transition-all border border-zinc-800 hover:border-zinc-700"
                    } else {
                        "h-8 px-3 rounded-md text-black text-xs font-medium transition-all"
                    },
                    style: if props.is_running {
                        "color: #ff0000;"
                    } else {
                        "background-color: #c7ff00;"
                    },
                    onclick: move |_| props.on_toggle_network.call(()),
                    if props.is_running {
                        "Stop"
                    } else {
                        "Start Network"
                    }
                }
            }

            // Center - Scenario controls
            if props.is_running {
                div {
                    class: "flex items-center gap-2 flex-1 justify-center",

                    // Scenario selector
                    select {
                        class: "h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-800 cursor-pointer transition-all",
                        onchange: move |evt| {
                            if let Ok(idx) = evt.value().parse::<usize>() {
                                props.on_scenario_select.call(idx);
                            }
                        },
                        option {
                            value: "",
                            "Select Scenario"
                        }
                        for (idx, scenario_name) in props.scenarios.iter().enumerate() {
                            option {
                                value: "{idx}",
                                "{scenario_name}"
                            }
                        }
                    }

                    // Play scenario button (icon only)
                    if props.is_playing_scenario {
                        button {
                            class: "h-8 w-8 flex items-center justify-center rounded-md cursor-not-allowed",
                            style: "background-color: #c7ff00;",
                            // Spinning loader
                            div {
                                class: "w-3.5 h-3.5 rounded-full",
                                style: "border: 2px solid #000; border-top-color: transparent; animation: spin 0.8s linear infinite;",
                            }
                        }
                    } else if props.selected_scenario.is_none() {
                        button {
                            class: "h-8 w-8 flex items-center justify-center rounded-md bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed",
                            // Play icon (disabled)
                            svg {
                                class: "w-3.5 h-3.5",
                                fill: "currentColor",
                                view_box: "0 0 24 24",
                                path {
                                    d: "M8 5v14l11-7z"
                                }
                            }
                        }
                    } else {
                        button {
                            class: "h-8 w-8 flex items-center justify-center rounded-md text-black transition-all",
                            style: "background-color: #c7ff00;",
                            onclick: move |_| props.on_play_scenario.call(()),
                            onmouseenter: move |_| {},
                            onmouseleave: move |_| {},
                            // Play icon
                            svg {
                                class: "w-3.5 h-3.5",
                                fill: "currentColor",
                                view_box: "0 0 24 24",
                                path {
                                    d: "M8 5v14l11-7z"
                                }
                            }
                        }
                    }

                    // Import button
                    button {
                        class: "h-8 w-8 flex items-center justify-center rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all",
                        onclick: move |_| props.on_import_scenario.call(()),
                        title: "Import Scenario",
                        // Import/download icon
                        svg {
                            class: "w-3.5 h-3.5",
                            fill: "none",
                            stroke: "currentColor",
                            view_box: "0 0 24 24",
                            path {
                                stroke_linecap: "round",
                                stroke_linejoin: "round",
                                stroke_width: "2",
                                d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                            }
                        }
                    }

                    // Export button
                    button {
                        class: "h-8 w-8 flex items-center justify-center rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all",
                        onclick: move |_| props.on_export_scenario.call(()),
                        title: "Export Scenario",
                        // Export/upload icon
                        svg {
                            class: "w-3.5 h-3.5",
                            fill: "none",
                            stroke: "currentColor",
                            view_box: "0 0 24 24",
                            path {
                                stroke_linecap: "round",
                                stroke_linejoin: "round",
                                stroke_width: "2",
                                d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            }
                        }
                    }
                }
            }

            // Right side - Reset, Add homeserver and client buttons
            div {
                class: "flex items-center gap-2 flex-1 justify-end",

                // Reset button (outline style)
                if props.is_running {
                    button {
                        class: "h-8 w-8 flex items-center justify-center rounded-md bg-transparent transition-all",
                        style: "color: #ff0000; border: 1px solid #ff0000;",
                        onclick: move |_| props.on_reset.call(()),
                        title: "Reset Network",
                        // Reset/refresh icon
                        svg {
                            class: "w-3.5 h-3.5",
                            fill: "none",
                            stroke: "currentColor",
                            view_box: "0 0 24 24",
                            path {
                                stroke_linecap: "round",
                                stroke_linejoin: "round",
                                stroke_width: "2",
                                d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            }
                        }
                    }
                }

                button {
                    class: if props.is_running && !props.is_creating_homeserver {
                        "h-8 px-3 rounded-md text-black text-xs font-medium transition-all flex items-center gap-1.5"
                    } else {
                        "h-8 px-3 rounded-md bg-zinc-900 text-zinc-600 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed border border-zinc-800"
                    },
                    style: if props.is_running && !props.is_creating_homeserver { "background-color: #c7ff00;" } else { "" },
                    onclick: move |_| props.on_add_homeserver.call(()),

                    // Plus icon
                    svg {
                        class: "w-3.5 h-3.5",
                        fill: "none",
                        stroke: "currentColor",
                        view_box: "0 0 24 24",
                        path {
                            stroke_linecap: "round",
                            stroke_linejoin: "round",
                            stroke_width: "2",
                            d: "M12 4v16m8-8H4"
                        }
                    }

                    "Add Homeserver"
                }

                button {
                    class: if props.is_running && !props.is_creating_client {
                        "h-8 px-3 rounded-md text-black text-xs font-medium transition-all flex items-center gap-1.5"
                    } else {
                        "h-8 px-3 rounded-md bg-zinc-900 text-zinc-600 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed border border-zinc-800"
                    },
                    style: if props.is_running && !props.is_creating_client { "background-color: #c7ff00;" } else { "" },
                    onclick: move |_| props.on_add_client.call(()),

                    // Plus icon
                    svg {
                        class: "w-3.5 h-3.5",
                        fill: "none",
                        stroke: "currentColor",
                        view_box: "0 0 24 24",
                        path {
                            stroke_linecap: "round",
                            stroke_linejoin: "round",
                            stroke_width: "2",
                            d: "M12 4v16m8-8H4"
                        }
                    }

                    "Add Client"
                }
            }
        }
    }
}
