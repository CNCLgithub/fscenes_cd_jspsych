import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";



const info = <const>{
    name: "flicker-key-response",
    parameters: {
        /**
         * The string to be displayed.
         */
        first_stim: {
            type: ParameterType.HTML_STRING,
            default: undefined,
        },
        mask: {
            type: ParameterType.HTML_STRING,
            default: undefined,
        },
        second_stim: {
            type: ParameterType.HTML_STRING,
            default: undefined,
        },
        /**
         * This array contains the key(s) that the participant is allowed to press in order to respond
         * to the stimulus. Keys should be specified as characters (e.g., `'a'`, `'q'`, `' '`, `'Enter'`, `'ArrowDown'`) - see
         * {@link https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values this page}
         * and
         * {@link https://www.freecodecamp.org/news/javascript-keycode-list-keypress-event-key-codes/ this page (event.key column)}
         * for more examples. Any key presses that are not listed in the
         * array will be ignored. The default value of `"ALL_KEYS"` means that all keys will be accepted as valid responses.
         * Specifying `"NO_KEYS"` will mean that no responses are allowed.
         */
        choices: {
            type: ParameterType.KEYS,
            default: ["f", "j"],
        },
        /**
         * This string can contain HTML markup. Any content here will be displayed below the stimulus.
         * The intention is that it can be used to provide a reminder about the action the participant
         * is supposed to take (e.g., which key to press).
         */
        prompt: {
            type: ParameterType.HTML_STRING,
            default: "<b>F</b> no path changed, <b>J</b> path changed",
        },
        /**
         * How long to display the stimulus in milliseconds. The visibility CSS property of the stimulus
         * will be set to `hidden` after this time has elapsed. If this is null, then the stimulus will
         * remain visible until the trial ends.
         */
        stimulus_duration: {
            type: ParameterType.INT,
            default: 1000,
        },
        /**
         * How long to display the mask in milliseconds.
         * */
        mask_duration: {
            type: ParameterType.INT,
            default: 1000,
        },
    },
    data: {
        key: {
            type: ParameterType.STRING,
        },
        /** The response time in milliseconds for the participant to make a response. The time is measured from when the stimulus first appears on the screen until the participant's response. */
        rt: {
            type: ParameterType.INT,
        },
    },
};

type Info = typeof info;

/**
 * This plugin displays HTML content and records responses generated with the keyboard.
 * The stimulus can be displayed until a response is given, or for a pre-determined amount of time.
 * The trial can be ended automatically if the participant has failed to respond within a fixed length of time.
 *
 * @author Josh de Leeuw
 * @see {@link https://www.jspsych.org/latest/plugins/html-keyboard-response/ html-keyboard-response plugin documentation on jspsych.org}
 */
class FlickerKeyResponsePlugin implements JsPsychPlugin<Info> {
    static info = info;
    constructor(private jsPsych: JsPsych) {}

    trial(display_element: HTMLElement, trial: TrialType<Info>) {
        var new_html =
            '<div id="jspsych-html-click-response-stimulus">' +
            trial.first_stim +
            trial.second_stim +
            trial.mask +
            `<div class="centered" style="font-size:80px">+</div>`;
        ("</div>");

        // add prompt
        if (trial.prompt !== null) {
            new_html += '<div class="flicker-prompt">' + trial.prompt + '</div>';
        }

        // draw
        display_element.innerHTML = new_html;
        var start_time = Date.now();

        // store response
        var response = {
            rt: null,
            clickX: null,
            clickY: null,
        };

        let step = 0;
        let cycle_stimuli = () => {
            const first = display_element.querySelector<HTMLElement>("#first");
            const second =
                display_element.querySelector<HTMLElement>("#second");
            const mask = display_element.querySelector<HTMLElement>("#mask");
            let duration = 0;
            first.style.visibility = "hidden";
            second.style.visibility = "hidden";
            mask.style.visibility = "hidden";
            if (step == 1) {
                first.style.visibility = "visible";
                duration = trial.stimulus_duration;
            } else if (step == 3) {
                second.style.visibility = "visible";
                duration = trial.stimulus_duration;
            } else {
                // steps 0,2
                mask.style.visibility = "visible";
                duration = trial.mask_duration;
            }
            step = (step + 1) % 4;
            interval = setTimeout(cycle_stimuli, duration);
        };

        let interval = setTimeout(cycle_stimuli, 0);

        // function to end trial when it is time
        const end_trial = () => {
            clearTimeout(interval);
            // kill keyboard listeners
            if (typeof keyboardListener !== "undefined") {
                this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
            }

            // gather the data to store for the trial
            var trial_data = {
                rt: response.rt,
                key: response.key,
            };
            console.log(trial_data);

            // move on to the next trial
            this.jsPsych.finishTrial(trial_data);
        };

        // function to handle responses by the subject
        var after_response = (info) => {
            // after a valid response, the stimulus will have the CSS class 'responded'
            // which can be used to provide visual feedback that a response was recorded
            // display_element.querySelector(
            //     "#jspsych-html-click-response-stimulus",
            // ).className += " responded";
            const rt = Date.now() - start_time;
            const dt = 2 * trial.stimulus_duration + trial.mask_duration;
            console.log(`DT: ${dt}, RT: ${rt}`);
            // Check if each stim was shown at least once
            if (rt > dt) {
                // only record the first response
                if (response.rt == null) {
                    response = info;
                }
                end_trial();
            }
        };

        // start the response listener
        if (trial.choices != "NO_KEYS") {
            var keyboardListener = this.jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: after_response,
                valid_responses: trial.choices,
                rt_method: "performance",
                persist: true,
                allow_held_key: false,
            });
        }

    }

    simulate(
        trial: TrialType<Info>,
        simulation_mode,
        simulation_options: any,
        load_callback: () => void,
    ) {
        if (simulation_mode == "data-only") {
            load_callback();
            this.simulate_data_only(trial, simulation_options);
        }
        if (simulation_mode == "visual") {
            this.simulate_visual(trial, simulation_options, load_callback);
        }
    }

    private create_simulation_data(trial: TrialType<Info>, simulation_options) {
        const default_data = {
            rt: this.jsPsych.randomization.sampleExGaussian(
                500,
                50,
                1 / 150,
                true,
            ),
            clickX: 100 * (Math.random() - 0.5),
            clickY: 100 * (Math.random() - 0.5),
        };

        const data = this.jsPsych.pluginAPI.mergeSimulationData(
            default_data,
            simulation_options,
        );

        this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);

        return data;
    }

    private simulate_data_only(trial: TrialType<Info>, simulation_options) {
        const data = this.create_simulation_data(trial, simulation_options);

        this.jsPsych.finishTrial(data);
    }

    private simulate_visual(
        trial: TrialType<Info>,
        simulation_options,
        load_callback: () => void,
    ) {
        const data = this.create_simulation_data(trial, simulation_options);

        const display_element = this.jsPsych.getDisplayElement();

        this.trial(display_element, trial);
        load_callback();

        if (data.rt !== null) {
            const target = document.querySelector(
                "#jspsych-html-click-response-stimulus",
            );
            this.jsPsych.pluginAPI.clickTarget(target, data.rt);
        }
    }
}

export default FlickerKeyResponsePlugin;
