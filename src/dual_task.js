/**
 * @title Dual Task Draw test
 * @description dataset=window-0.1/2025-02-05_vifdDO, gmask, 850ms
 * @version 0.2
 * @assets assets/
 */

// You can import stylesheets (.scss or .css).
import "../styles/main.scss";

// import jatos from "@jatos/jatos";
import VirtualChinrestPlugin from '@jspsych/plugin-virtual-chinrest';
import PreloadPlugin from "@jspsych/plugin-preload";
import ExternalHtmlPlugin from "@jspsych/plugin-external-html";
import FullscreenPlugin from "@jspsych/plugin-fullscreen";
import SurveyTextPlugin from "@jspsych/plugin-survey-text";
import InstructionsPlugin from "@jspsych/plugin-instructions";
import SurveyMultiChoicePlugin from "@jspsych/plugin-survey-multi-choice";
import HtmlButtonResponsePlugin from "@jspsych/plugin-html-button-response";
import HtmlKeyboardResponsePlugin from "@jspsych/plugin-html-keyboard-response";
// import SketchpadPlugin from '@jspsych/plugin-sketchpad';
import SketchpadPlugin from './plugins/sketchpad.ts';
import ImageKeyboardResponsePlugin from "@jspsych/plugin-image-keyboard-response";
import { initJsPsych } from "jspsych";

// Prolific variables
const PROLIFIC_URL = 'https://app.prolific.com/submissions/complete?cc=782B6DAB';

// Define global experiment variables
const N_SCENES = 10;
const N_CD_TRIALS = N_SCENES * 4; // 2 doors * 2 conditions (change  + no change)
const N_DRAW_TRIALS = N_SCENES * 2; // 2 doors
const EXP_DURATION = 10; // in minutes
const STIM_IMAGE_W = 873; // pixels
const STIM_IMAGE_H = 491;
const STIM_DEG = 14; // visual degrees of image width
const PIXELS_PER_UNIT = STIM_IMAGE_W / STIM_DEG;
const STIM_IMAGE_DUR = 850; // ms
const MASK_IMAGE_DUR = 1500; // ms
const BTWN_TRIAL_DUR = 1500; // ms
const STIM_IMAGE_FLIPY = false; // for inverted experiment
const N_MASKS = 5;
const RAND_MASK = false;
const REVERSE_ORDER = false;

// Debug Variables
const SKIP_CHINREST = false;
const SKIP_CONSENT = false;
const SKIP_PROLIFIC_ID = false;
const SKIP_INSTRUCTIONS = false;

let IMG_SCALE = 1.0;

var genImgHtml = function (img, flipx) {
    const sx = flipx ? -1 : 1;
    const sy = STIM_IMAGE_FLIPY ? -1 : 1;
    const path = `assets/images/${img}`;
    // from https://stackoverflow.com/a/17698171
    const trans = `transform: scaleY(${sy}) scaleX(${sx});`
    const img_dims = `width:${STIM_IMAGE_W*IMG_SCALE}px;height:${STIM_IMAGE_H*IMG_SCALE}px`
    const ihtml = `<image src=${path} style="${img_dims};${trans}"\>`;
    return ihtml;
};

var sampleRandomMask = function (jsPsych) {
    const mask_id = jsPsych.randomization.randomInt(1, N_MASKS);
    const mask_file = `mask_${mask_id}.png`
    return mask_file;
};

var cdTrial = function (jsPsych, img_a, img_b, flipx) {

    if (REVERSE_ORDER) {
        [img_a, img_b] = [img_b, img_a]
    }

    const img_1 = {
        type: HtmlKeyboardResponsePlugin,
        stimulus: `<div class="centered"> ${genImgHtml(img_a, flipx)} </div>`,
        choices: "NO_KEYS",
        trial_duration: STIM_IMAGE_DUR,
    };

    const mask_img = RAND_MASK ? sampleRandomMask(jsPsych) : "grey_mask.png";
    const mask = {
        type: HtmlKeyboardResponsePlugin,
        stimulus: `<div class="centered"> ${genImgHtml(mask_img, false)} </div>`,
        choices: "NO_KEYS",
        trial_duration: MASK_IMAGE_DUR,

    };
    const img_2 = {
        type: HtmlKeyboardResponsePlugin,
        stimulus: `<div class="centered"> ${genImgHtml(img_b, flipx)} </div>`,
        choices: "NO_KEYS",
        trial_duration: STIM_IMAGE_DUR,
    };
    const response = {
        type: HtmlKeyboardResponsePlugin,
        stimulus: '',
        choices: ['f', 'j'],
        prompt: `<p>Press 'f' if the image stayed the <b>SAME</b>.</p> <p>Press 'j' if the image <b>CHANGED</b>.</p>`,
        post_trial_gap: BTWN_TRIAL_DUR,

    };

    const tl = {
        timeline: [img_1, mask, img_2, response],
        data: {
            a: img_a.slice(0, -4),
            b: img_b.slice(0, -4),
            mask: mask_img,
        }
    };
    return (tl);
};


var drawTrial = function (jsPsych, img_src, flipx) {
    const img = {
        type: HtmlKeyboardResponsePlugin,
        stimulus: `<div class="centered"> ${genImgHtml(img_src, flipx)} </div>`,
        choices: "NO_KEYS",
        trial_duration: STIM_IMAGE_DUR,
    };

    const mask_src = RAND_MASK ? sampleRandomMask(jsPsych) : "grey_mask.png";
    const mask = {
        type: HtmlKeyboardResponsePlugin,
        stimulus: `<div class="centered"> ${genImgHtml(mask_src, false)} </div>`,
        choices: "NO_KEYS",
        trial_duration: MASK_IMAGE_DUR,

    };

    const draw = {
        type: SketchpadPlugin,
        prompt: `<p>Please draw the shortest path to the door.</p>`,
        prompt_location: 'belowcanvas',
        canvas_width: STIM_IMAGE_W*IMG_SCALE,
        canvas_height: STIM_IMAGE_H,
        canvas_border_width: 2,
        stroke_width: 4,
        save_strokes: false,
    };

    const tl = {
        timeline: [img, mask, draw],
        data: {
            img: img_src.slice(0, -4),
            mask: mask_src,
        }
    };
    return (tl);
};

/**
 * This function will be executed by jsPsych Builder and is expected to run the jsPsych experiment
 *
 * @type {import("jspsych-builder").RunFunction}
 */
export async function run({ assetPaths, input = {}, environment, title, version }) {
    const jsPsych = initJsPsych({
        show_progress_bar: true,
        on_finish: function(data) {
            if (typeof jatos !== 'undefined') {
                // in jatos environment
                jatos.endStudyAndRedirect(PROLIFIC_URL, jsPsych.data.get().json());
            } else {
                jsPsych.data.displayData("json");
                return jsPsych;
            };
        },
        on_interaction_data_update: function (data) {
            if (data.event == "fullscreenexit" && should_be_in_fullscreen) {
                console.log("exited fullscreen");
                // hide the contents of the current trial
                jsPsych.getDisplayElement().style.visibility = "hidden";
                // add a div that contains a message and button to re-enter fullscreen
                jsPsych
                    .getDisplayElement()
                    .insertAdjacentHTML(
                        "beforebegin",
                        '<div id="message-div" style="margin: auto; width: 100%; text-align: center;">' +
                            "<p>Please remain in fullscreen mode during the task.</p>" +
                            "<p>When you click the button below, you will enter fullscreen mode.</p>" +
                            '<button id="jspsych-fullscreen-btn" class="jspsych-btn">Continue</button></div>',
                    );
                // call the request fullscreen function when the button is clicked
                document
                    .querySelector("#jspsych-fullscreen-btn")
                    .addEventListener("click", function () {
                        var element = document.documentElement;
                        if (element.requestFullscreen) {
                            element.requestFullscreen();
                        } else if (element.mozRequestFullScreen) {
                            element.mozRequestFullScreen();
                        } else if (element.webkitRequestFullscreen) {
                            element.webkitRequestFullscreen();
                        } else if (element.msRequestFullscreen) {
                            element.msRequestFullscreen();
                        }
                    });
            }
            if (data.event == "fullscreenenter") {
                console.log("entered fullscreen");
                // when entering fullscreen, check to see if the participant is re-entering fullscreen,
                // i.e. the 'please enter fullscreen' message is on the page
                var msg_div = document.querySelector("#message-div");
                if (msg_div !== null) {
                    // remove the message
                    msg_div.remove();
                    // show the contents of the current trial again
                    jsPsych.getDisplayElement().style.visibility = "visible";
                }
            }
        },
    });

    const timeline = [];

    if (!SKIP_CONSENT) {
        timeline.push({
            type: ExternalHtmlPlugin,
            url: assetPaths.misc[0],
            cont_btn: "start",
            check_fn: function () {
                if (document.getElementById("consent_checkbox").checked) {
                    return true;
                } else {
                    alert("You must tick the checkbox to continue with the study.");
                }
            },
        });
    }

    if (!SKIP_PROLIFIC_ID) {
        timeline.push({
            type: SurveyTextPlugin,
            questions: [{
                prompt: 'Please enter your Prolific ID',
                required: true
            }],
            data: {
                type: "prolific_id",
            }
        });
    };

    timeline.push({
        type: PreloadPlugin,
        images: assetPaths.images,
    });

    var should_be_in_fullscreen = false;
    timeline.push({
        type: FullscreenPlugin,
        fullscreen_mode: true,
        on_start: () => {
            should_be_in_fullscreen = true; // once this trial starts, the participant should be in fullscreen
        },
    });

    timeline.push({
        type: InstructionsPlugin,
        pages: [
            `<h1>Hi, welcome to our study!</h1><br><br> ` +
                `Please take a moment to adjust your seating so that you can comfortably watch the monitor and use the keyboard/mouse.<br> ` +
                `Feel free to dim the lights as well.  ` +
                `Close the door or do whatever is necessary to minimize disturbance during the experiment. <br> ` +
                `Please also take a moment to silence your phone so that you are not interrupted by any messages mid-experiment. ` +
                `<br><br> ` +
                `Click <b>Next</b> when you are ready to continue. `,
        ],
        show_clickable_nav: true,
        allow_backward: false,
        data: {
            type: "welcome",
        }
    });

    if (!SKIP_CHINREST) {
        timeline.push({
            type: VirtualChinrestPlugin,
            blindspot_reps: 3,
            resize_units: "deg",
            pixels_per_unit: PIXELS_PER_UNIT,
            on_finish : function(data) {
                let result = jsPsych.data.get().last(1).values()[0];
                IMG_SCALE = result.scale_factor;
                // scaling the parent div messes with drawing task
                document.getElementById("jspsych-content").style.transform = "";
                console.log(IMG_SCALE);
            }
        });
    }


    const instruct_cd = {
        type: InstructionsPlugin,
        pages: [
            `We know it is also difficult to stay focused for so long, especially when you are doing the same thing over and over.<br> ` +
                `But remember, the experiment will be all over in less than ${EXP_DURATION} minutes. <br>` +
                `Please do your best to remain focused! Your responses will only be useful to us if you remain focused. <br><br>` +
                `Click <b>Next</b> to continue.`,
            `In this study, you will view an image (like the one below).<br>After a short period of time, the image will dissapear and you will then be asked one of two questions. <br>` +
                genImgHtml("example_a.png", false) +
                `<br> Click <b>Next</b> to continue.`,
            `Sometimes, you will see a second image.<br>In this case, you will be asked to determine whether the two images are DIFFERENT by pressing the <b>J</b> key for <u>yes</u> and <b>F</b> key for <u>no</u>. <br> <br>` +
                `<strong>The next screen will be a demonstration trial.</strong> <br>` +
                `Click <b>Next</b> when you are ready to start the demonstration.`,
        ],
        show_clickable_nav: true,
        show_page_number: true,
        page_label: "<b>Instructions</b>",
        allow_backward: false,
    };

    const example_cd = cdTrial(jsPsych, "example_a.png", "example_b.png", false);
    const example_draw = drawTrial(jsPsych, "example_a.png", true);

    const instruct_draw = {
        type: InstructionsPlugin,
        pages: [
            `Other times, you will see a blank canvas.<br>In this case you will be asked to draw (using your mouse) the shortest path to the door,<br> taking care to avoid the blue obstacles. <br> <br>` +
                `<strong>The next screen will be a demonstration trial.</strong> <br>` +
                `Click <b>Next</b> when you are ready to start the demonstration.`,
        ],
        show_clickable_nav: true,
        show_page_number: true,
        page_label: "<b>Instructions</b>",
        allow_backward: false,
    };

    // comprehension check
    const comp_check = {
        type: SurveyMultiChoicePlugin,
        preamble: "<h2>Comprehension Check</h2>",
        questions: [
            {
                prompt: "Which key should you respond with if the image remains the same?",
                name: 'check1',
                options: ['f','j','s'],
                required: true
            },
            {
                prompt: "True or False: You can walk through the blue obstacles",
                name: 'check2',
                options: ['true',
                    'false'],
                required: true
            },
        ],
        randomize_question_order: false,
        on_finish: function (data) {
            var q1 = data.response.check1;
            var q2 = data.response.check2;
            // set to true if both comp checks are passed
            data.correct = (q1 == 'f' && q2 == 'false');
        },
        data: {
            // add any additional data that needs to be recorded here
            type: "comp_quiz",
        }
    };

    // feedback
    const comp_feedback = {
        type: HtmlButtonResponsePlugin,
        stimulus: function () {
            var last_correct_resp = jsPsych.data.getLastTrialData().values()[0].correct;

            if (last_correct_resp) {
                return `<span style='color:green'><h2>You passed the comprehension check!</h2></span> ` + `<br>When you're ready, please click <b>Next</b> to begin the study. `
            } else {
                return `<span style='color:red'><h2>You failed to respond <b>correctly</b> to all parts of the comprehension check.</h2></span> ` + `<br>Please click <b>Next</b> to revisit the instructions. `
            }
        },
        choices: ['Next'],
        data: {
            // add any additional data that needs to be recorded here
            type: "comp_feedback",
        }
    };

    // `comp_loop`: if answers are incorrect, `comp_check` will be repeated until answers are correct responses
    const comp_loop = {
        timeline: [instruct_cd, example_cd, instruct_draw, example_draw, comp_check, comp_feedback],
        loop_function: function (data) {
            // return false if comprehension passes to break loop
            let values = data.values();
            return (!(values[values.length - 2].correct));
        }
    };

    // add comprehension loop
    if (!SKIP_INSTRUCTIONS) {
        timeline.push(comp_loop);
    };

    // add exp trials with random shuffle, unique per session
    let exp_trials = [];
    let count = 0
    for (const scene of Array.from({length: N_SCENES}, (v, k) => k+1)) {
        const flipX = scene % 2 == 0;
        for (const door of [1, 2]) {
            const img_a = `${scene}_${door}.png`;
            const img_b = `${scene}_${door}_blocked.png`;
            exp_trials.push(cdTrial(jsPsych, img_a, img_a, flipX));
            exp_trials.push(cdTrial(jsPsych, img_a, img_b, flipX));
            exp_trials.push(drawTrial(jsPsych, img_a, flipX));
            count += 1;
        };
    };
    for (const trial of jsPsych.randomization.shuffle(exp_trials)) {
        timeline.push(trial);
    };

    timeline.push({
        type: SurveyTextPlugin,
        preamble: `<h2><b>Thank you for helping us with our study! </b></h2> It is ok if you felt that the task was difficult, it was designed to be hard.<br><br> ` +
            `Please fill out the survey below and click <b>Done</b> to complete the experiment. <br> `,
        questions: [
            {prompt: 'Did you find yourself using any strategies while performing judgment? ',
                name: 'Strategy', rows: 5, placeholder : 'None'},

            {prompt: "Are there any additional comments you'd like to add? ",
                name: 'General', rows: 5, placeholder : 'None'}
        ],
        button_label : 'Done'
    });

    await jsPsych.run(timeline);

}
