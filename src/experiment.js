/**
 * @title Change Detection
 * @description window-0.1/2025-02-05_vifdDO
 * @version window-0.1_2025-02-05_vifdDO_path_850_gmask
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
import ImageKeyboardResponsePlugin from "@jspsych/plugin-image-keyboard-response";
import { initJsPsych } from "jspsych";

// Prolific variables
const PROLIFIC_URL = 'https://app.prolific.com/submissions/complete?cc=782B6DAB';

// trial list
import trial_list from '../assets/condlist.json';

// Define global experiment variables
var N_TRIALS = trial_list.length;
const EXP_DURATION = 10; // in minutes
const STIM_IMAGE_W = 873; // pixels
const STIM_IMAGE_H = 491;
const STIM_DEG = 15; // visual degrees of image width
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

var genImgHtml = function (img, flipx) {
  const sx = flipx ? -1 : 1;
  const sy = STIM_IMAGE_FLIPY ? -1 : 1;
  const path = `assets/images/${img}`;
  // from https://stackoverflow.com/a/17698171
  const trans = `transform: scaleY(${sy}) scaleX(${sx});`
  const img_dims = `width:${STIM_IMAGE_W}px;height:${STIM_IMAGE_H}px`
  const ihtml = `<image src=${path} style="${img_dims};${trans}"\>`;
  return ihtml;
};

var sampleRandomMask = function (jsPsych) {
  const mask_id = jsPsych.randomization.randomInt(1, N_MASKS);
  const mask_file = `mask_${mask_id}.png`
  return mask_file;
};

/*  helper to generate timeline parts for a trial */
var genTrial = function (jsPsych, img_a, img_b, flipx) {

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
    prompt: `<p>Press 'f' if the paths remains the <b>SAME</b>.</p> <p>Press 'j' if the path has <b>CHANGED</b>.</p>`,
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
      url: assetPaths.misc[1],
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
      pixels_per_unit: PIXELS_PER_UNIT
    });
  }


  const instructions = {
      type: InstructionsPlugin,
      pages: [
      `We know it is also difficult to stay focused for so long, especially when you are doing the same thing over and over.<br> ` +
        `But remember, the experiment will be all over in less than ${EXP_DURATION} minutes. <br>` +
        `There are <strong>${N_TRIALS} trials</strong> in this study. <br>` +
        `Please do your best to remain focused! Your responses will only be useful to us if you remain focused. <br><br>` +
        `Click <b>Next</b> to continue.`,
      `In this study, two images of indoor rooms (like the one below) will briefly appear one after the other. These rooms <b>will change</b> in one spot.<br>` +
        `Your task is to determine whether the change impacts the path to the door by pressing the <b>J</b> key for <u>yes</u> and <b>F</b> key for <u>no</u>. <br> <br>` +
        genImgHtml("example_a.png", false) +
        `<br> Click <b>Next</b> to continue.`,
      `Remember, your task is to simply determine whether the path changes (the images will always change somewhere). <br>` +
        `Here is a general illustration of where the path to the door might be <br><br>` +
        genImgHtml("example_a_path.png", false) +
        `<br> Click <b>Next</b> to continue.`,
      `<strong>The next screen will be a demonstration trial.</strong> <br>` +
        `Click <b>Next</b> when you are ready to start the demonstration.`,
      ],
      show_clickable_nav: true,
      show_page_number: true,
      page_label: "<b>Instructions</b>",
      allow_backward: false,
  };


  //        example
  const exampleTrial = genTrial(jsPsych, "example_a.png", "example_b.png", false);

  // comprehension check
  const comp_check = {
      type: SurveyMultiChoicePlugin,
      preamble: "<h2>Comprehension Check</h2>",
      questions: [{
              prompt: "Which key should you respond with if the path remains the same?",
              name: 'check1',
              options: ['f','j','s'],
              required: true
          },
          {
              prompt: "True or False: The two images will always be different",
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
          data.correct = (q1 == 'f' && q2 == 'true');
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
      timeline: [instructions, exampleTrial, comp_check, comp_feedback],
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
  for (const trial of jsPsych.randomization.shuffle(trial_list)) {
      const [img_a, img_b, flipX] = trial
      timeline.push(genTrial(jsPsych, img_a, img_b, flipX));
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
