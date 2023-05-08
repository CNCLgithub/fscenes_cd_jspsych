/**
 * @title Change Detection
 * @description Change Detection experiment for FunctionalScenes
 * @version 0.1.0
 *
 * @assets assets/
 */

// You can import stylesheets (.scss or .css).
import "../styles/main.scss";

// import jatos from "@jatos/jatos";
import ResizePlugin from "@jspsych/plugin-resize";
import PreloadPlugin from "@jspsych/plugin-preload";
import ExternalHtmlPlugin from "@jspsych/plugin-external-html";
import FullscreenPlugin from "@jspsych/plugin-fullscreen";
import SurveyTextPlugin from "@jspsych/plugin-survey-text";
import InstructionsPlugin from "@jspsych/plugin-instructions";
import SameDifferentHtmlPlugin from "@jspsych/plugin-same-different-html";
import SurveyMultiChoicePlugin from "@jspsych/plugin-survey-multi-choice";
import HtmlButtonResponsePlugin from "@jspsych/plugin-html-button-response";
import HtmlKeyboardResponsePlugin from "@jspsych/plugin-html-keyboard-response";
import ImageKeyboardResponsePlugin from "@jspsych/plugin-image-keyboard-response";
import { initJsPsych } from "jspsych";

// Prolific variables
const PROLIFIC_URL = 'https://app.prolific.co/submissions/complete?cc=782B6DAB';

// trial list
import trial_list_wrapped from '../assets/condlist.json';
const trial_list = trial_list_wrapped[0];

// Define global experiment variables
var N_TRIALS = trial_list.length;
var EXP_DURATION = 20;
const STIM_IMAGE_W = '12.75cm';
const STIM_IMAGE_H = '8.5cm';
const STIM_IMAGE_DUR = 500; // ms
const STIM_MASK_DUR = 750; // ms
const STIM_IMAGE_FLIPY = false;

// Debug Variables
const SKIP_PROLIFIC_ID = false;
const SKIP_INSTRUCTIONS = false;

/*  helper to generate timeline parts for a trial */
var genTrial = function (jsPsych, img_a, img_b, flipx) {
  const sx = flipx ? -1 : 1;
  const sy = STIM_IMAGE_FLIPY ? -1 : 1;
  const path_a = `assets/images/${img_a}`;
  const path_b = `assets/images/${img_b}`;
  const sd = {
    type: SameDifferentHtmlPlugin,
    stimuli: [
      // from https://stackoverflow.com/a/17698171
      // TODO: set image scale
      `<div class="centered"><image src=${path_a} style="width:${STIM_IMAGE_W};height:${STIM_IMAGE_H};scaleX(${sx});scaleY(${sy})"\></div>`,
      `<div class="centered"><image src=${path_b} style="width:${STIM_IMAGE_W};height:${STIM_IMAGE_H};scaleX(${sx});scaleY(${sy})"\></div>`
    ],
    prompt: `<p>Press 'f' if the images are the <b>SAME</b>.</p> <p>Press 'j' if the images are <b>DIFFERENT</b>.</p>`,
    same_key: 'f',
    different_key: 'j',
    first_stim_duration: STIM_IMAGE_DUR,
    gap_duration: STIM_MASK_DUR,
    second_stim_duration: STIM_IMAGE_DUR,
    post_trial_gap: 1000, // 1000ms gap
    answer: img_a == img_b ? 'same' : 'different',
    // trial data used for analysis
    data: {
      a: img_a.slice(0, -4),
      b: img_b.slice(0, -4),
    }
  };
  return (sd);
};

/**
 * This function will be executed by jsPsych Builder and is expected to run the jsPsych experiment
 *
 * @type {import("jspsych-builder").RunFunction}
 */
export async function run({ assetPaths, input = {}, environment, title, version }) {
  const jsPsych = initJsPsych({
    show_progress_bar: true,
    // TODO: figure this out; see https://github.com/bjoluc/jspsych-builder/issues/38
    on_finish: function(data) {
      jatos.endStudyAndRedirect(PROLIFIC_URL, jsPsych.data.get().json());
    }
    // on_finish: () => jatos.endStudy(jsPsych.data.get().json()),
    // on_trial_finish: function (data) {
    //   jatos.appendResultData(data);
    // },
  });

  const timeline = [];

  // consent
  timeline.push({
    type: ExternalHtmlPlugin,
    url: assetPaths.misc[1],
    cont_btn: 'start',
    check_fn: function() {
      if (document.getElementById('consent_checkbox').checked) {
        return true;
      } else {
        alert('You must tick the checkbox to continue with the study.')
      }
    }
  });

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

  // Preload assets
  timeline.push({
    type: PreloadPlugin,
    images: assetPaths.images,
  });

  // Switch to fullscreen
  timeline.push({
    type: FullscreenPlugin,
    fullscreen_mode: true,
  });

  // Welcome screen
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
        // add any additional data that needs to be recorded here
        type: "welcome",
    }
  });

  // resizing
  timeline.push({
      type: ResizePlugin,
      item_width: 480, // 3 + 3 / 8,
      item_height: 288, // 2 + 1 / 8,
      starting_size: 384,
      prompt: `<p>Please sit comfortably in front of you monitor and outstretch your arm holding a credit card (or a similary sized ID card).</p> <p>Click and drag the lower right corner of the box until the box is the same size as a credit card held up to the screen.</p> `,
      pixels_per_unit: 1,
      data: {
          type: "cc_scale"
      },
  });


  // instructions
  const instructions = {
      type: InstructionsPlugin,
      pages: [
          `The study is designed to be <i>challenging</i>. Sometimes, you'll be certain about what you saw. Other times, you won't be -- and this is okay! Just give your best guess each time. <br><br>` + `Click <b>Next</b> to continue.`,
          `We know it is also difficult to stay focused for so long, especially when you are doing the same thing over and over. But remember, the experiment will be all over in less than ${EXP_DURATION} minutes. <br>` + `There are <strong>${N_TRIALS} trials</strong> in this study. <br>` + `Please do your best to remain focused! Your responses will only be useful to us if you remain focused. <br><br>` + `Click <b>Next</b> to continue.`,
          `In this study, two images will briefly appear one after the other. You will be asked to determine whether the two images are the same. <br>` +
          `After the second image dissapears, press <b>"f"</b> if the images are the <b>SAME</b> or <b>"j"</b> if the images are <b>DIFFERENT</b> <br> <br>` +
          `Click <b>Next</b> to continue.`,
          `<strong>The next screen will be a demonstration trial.</strong> <br>` +
          `Please take the time to familiarize yourself with the interface during the demonstration. <br><br>` +
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
              prompt: "Which key should you respond with if the two images are the same?",
              name: 'check1',
              options: ['j','f','s'],
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
      timeline: [instructions, exampleTrial, comp_check, comp_feedback],
      loop_function: function (data) {
          // return false if comprehension passes to break loop
          return (!(data.values()[2].correct));
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
    preamble: `<h2><b>Thank you for helping us with our study! :) </b></h2><br><br> ` +
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

  // Return the jsPsych instance so jsPsych Builder can access the experiment results (remove this
  // if you handle results yourself, be it here or in `on_finish()`)
  // return jsPsych;
}
