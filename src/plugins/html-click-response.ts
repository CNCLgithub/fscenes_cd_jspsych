import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

const info = <const>{
    name: "html-click-response",
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
        target: {
            type: ParameterType.STRING,
            default: "jspsych-html-click-response-stimulus",
        },
        /**
         * This string can contain HTML markup. Any content here will be displayed below the stimulus.
         * The intention is that it can be used to provide a reminder about the action the participant
         * is supposed to take (e.g., which key to press).
         */
        prompt: {
            type: ParameterType.HTML_STRING,
            default: null,
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
         * How long to wait for the participant to make a response before ending the trial in milliseconds.
         * If the participant fails to make a response before this timer is reached, the participant's response
         * will be recorded as null for the trial and the trial will end. If the value of this parameter is null,
         * then the trial will wait for a response indefinitely.
         */
        trial_duration: {
            type: ParameterType.INT,
            default: null,
        },
        /**
         * If true, then the trial will end whenever the participant makes a response (assuming they make their
         * response before the cutoff specified by the trial_duration parameter). If false, then the trial will
         * continue until the value for trial_duration is reached. You can set this parameter to false to force
         * the participant to view a stimulus for a fixed amount of time, even if they respond before the time is complete.
         */
        response_ends_trial: {
            type: ParameterType.BOOL,
            default: true,
        },
    },
    data: {
        /** X coordinate of click. */
        clickX: {
            type: ParameterType.FLOAT,
        },
        /** Y coordinate of click. */
        clickY: {
            type: ParameterType.FLOAT,
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
class HtmlClickResponsePlugin implements JsPsychPlugin<Info> {
    static info = info;
    constructor(private jsPsych: JsPsych) {}

    trial(display_element: HTMLElement, trial: TrialType<Info>) {
        var new_html =
            '<div id="jspsych-html-click-response-stimulus">' +
            trial.first_stim +
            trial.second_stim +
            trial.mask +
            "</div>";

        // add prompt
        if (trial.prompt !== null) {
            new_html += trial.prompt;
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

        var step = 0;
        var cycle_stimuli = () => {
            const first = display_element.querySelector<HTMLElement>("#first");
            const second =
                display_element.querySelector<HTMLElement>("#second");
            const mask = display_element.querySelector<HTMLElement>("#mask");
            first.style.display = "none";
            second.style.display = "none";
            mask.style.display = "none";
            if (step == 0) {
                first.style.display = "block";
            } else if (step == 2) {
                second.style.display = "block";
            } else {
                mask.style.display = "block";
            }
            step = (step + 1) % 4;
        };
        var interval = setInterval(cycle_stimuli, trial.stimulus_duration);

        // function to end trial when it is time
        const end_trial = () => {
            clearInterval(interval);
            let elem = display_element.querySelector<HTMLElement>(
                "#jspsych-html-click-response-stimulus",
            );
            // kill click listeners
            if (elem != null) {
                elem.removeEventListener("click", after_response);
            }

            // gather the data to store for the trial
            var trial_data = {
                rt: response.rt,
                clickX: response.clickX,
                clickY: response.clickY,
            };
            console.log(trial_data);

            // move on to the next trial
            this.jsPsych.finishTrial(trial_data);
        };

        // Helper function to get an element's exact position
        const getPosition = (el: HTMLElement) => {
            let xPos = 0;
            let yPos = 0;

            while (el) {
                if (el.tagName == "BODY") {
                    // deal with browser quirks with body/window/document and page scroll
                    var xScroll =
                        el.scrollLeft || document.documentElement.scrollLeft;
                    var yScroll =
                        el.scrollTop || document.documentElement.scrollTop;

                    xPos += el.offsetLeft - xScroll + el.clientLeft;
                    yPos += el.offsetTop - yScroll + el.clientTop;
                } else {
                    // for all other non-BODY elements
                    xPos += el.offsetLeft - el.scrollLeft + el.clientLeft;
                    yPos += el.offsetTop - el.scrollTop + el.clientTop;
                }

                el = el.offsetParent;
            }
            return {
                x: xPos,
                y: yPos,
            };
        };

        // from https://www.kirupa.com/snippets/move_element_to_click_position.htm
        const getClickPosition = (e: MouseEvent) => {
            const parentPosition = getPosition(e.target);
            console.log(parentPosition);
            const xPosition = e.clientX - parentPosition.x;
            const yPosition = e.clientY - parentPosition.y;
            return { x: xPosition, y: yPosition };
        };

        // function to handle responses by the subject
        var after_response = (e: MouseEvent) => {
            // after a valid response, the stimulus will have the CSS class 'responded'
            // which can be used to provide visual feedback that a response was recorded
            // display_element.querySelector(
            //     "#jspsych-html-click-response-stimulus",
            // ).className += " responded";
            const rt = Date.now() - start_time;
            // Check if each stim was shown at least once
            if (rt > 3 * trial.stimulus_duration) {
                // const pos = getClickPosition(e);
                const bbox = e.target.getBoundingClientRect();

                console.log(bbox);
                console.log(e.clientX);
                // console.log(e.offsetX);
                // console.log(e.clientX - bbox.x);
                // only record the first response
                if (response.rt == null) {
                    response = {
                        rt: rt,
                        // clickX: pos.x,
                        // clickY: pos.y,
                        clickX: (e.clientX - bbox.left) / bbox.width,
                        clickY: (e.clientY - bbox.top) / bbox.height,
                    };
                }
                end_trial();
            }
        };

        // start the response listener
        display_element
            .querySelector("#" + trial.target)
            .addEventListener("click", after_response);
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

export default HtmlClickResponsePlugin;
