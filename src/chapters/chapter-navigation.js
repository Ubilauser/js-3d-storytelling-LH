import { story } from "../main.js";
import {
  createCustomRadiusShader,
  performFlyTo,
  removeCustomRadiusShader,
} from "../utils/cesium.js";
import { setSelectedMarker } from "../utils/create-markers.js";
import { getParams, setParams } from "../utils/params.js";
import { loadSvg } from "../utils/svg.js";
import { setTextContent } from "../utils/ui.js";

/**
 * The time in milliseconds between each chapter progression
 * @readonly
 */
const TIME_PER_CHAPTER = 3000;
/**
 * The radius size of the  highlighted area
 * @readonly
 */
const HIGHLIGHT_RADIUS = 250;

// SVG icons
/**
 * Icon shown to pause the autoplay
 */
const PAUSE_ICON = await loadSvg("round-pause-button");
/**
 * Icon shown to pause the autoplay
 */
const PLAY_ICON = await loadSvg("round-play-button");

// Html elements
/** The nav element shown on the intro details overlay
 * @type {HTMLNavElement}
 */
const introNavigation = document.querySelector(".intro-navigation");
/** The nav element shown on the story details overlay
 * @type {HTMLNavElement}
 */
const detailNavigation = document.querySelector(".detail-navigation");
/** The button to start the story / leave the intro overlay with
 * @type {HTMLButtonElement}
 */
const startButton = introNavigation.querySelector("#start-story");
/** The button to play the story chapter by chapter
 * @type {HTMLButtonElement}
 */
const autoplayButton = detailNavigation.querySelector("#autoplay-story");
/** The button to progress the story backward with
 * @type {HTMLButtonElement}
 */
const backButton = detailNavigation.querySelector("#chapter-backward");
/** The button to progress the story forward with
 * @type {HTMLButtonElement}
 */
const forwardButton = detailNavigation.querySelector("#chapter-forward");

/**
 * The id used to identify the timeout instance for the story progression
 * @type {number | null}
 */
let intervalId = null;

/**
 * Initializes and manages chapter navigation for a story.
 * This function sets up navigation elements for the introduction and chapters of a story.
 * It determines the current chapter based on URL parameters and updates the UI accordingly.
 */
export function initChapterNavigation() {
  // Get the current chapter based on URL parameters
  const params = getParams();
  const chapterParam = params.get("chapterId");
  //Finds and returns a chapter from the story based on its title.
  const chapterData = story.chapters.find(
    (chapter) => chapter.id === chapterParam
  );

  // Set up event listeners
  startButton.addEventListener("click", () => {
    activateNavigationElement("details");
    updateChapter(0);
  });

  forwardButton.addEventListener("click", () => {
    setNextChapter();
    stopAutoplay();
  });

  backButton.addEventListener("click", () => {
    setPreviousChapter();
    stopAutoplay();
  });

  autoplayButton.addEventListener("click", autoplayClickHandler);

  // Initialize chapter content based on URL parameters
  chapterData
    ? activateNavigationElement("details")
    : activateNavigationElement("intro");

  updateChapterContent(chapterData || story.properties, !chapterData);
}

/**
 * Stops the autoplay chapter progression of the story.
 */
function stopAutoplay() {
  autoplayButton.innerHTML = PLAY_ICON;
  clearTimeout(intervalId);
  intervalId = null;
}

/**
 * Progresses to the next chapter and stops progression if the current chapter is the last one.
 * @param {type} paramName - description of parameter
 */
function setNextAutoplayStep() {
  setNextChapter();
  if (getCurrentChapterIndex() === story.chapters.length - 1) {
    stopAutoplay();
  }
}

/**
 * Starts the autoplay chapter progression.
 */
function autoplayClickHandler() {
  // If the interval is already active, stop it
  if (intervalId) {
    stopAutoplay();
  } else {
    // If the interval is not active, start it
    intervalId = setInterval(setNextAutoplayStep, TIME_PER_CHAPTER);
    autoplayButton.innerHTML = PAUSE_ICON;
  }
}

/**
 * Sets the previous chapter as the current chapter.
 */
const setPreviousChapter = () => {
  const newChapterIndex = getCurrentChapterIndex() - 1;

  // If the new chapter index is positive, update the current chapter
  if (newChapterIndex >= 0) {
    updateChapter(newChapterIndex);
    // when going back further in the chapters, go back to teh intro
  } else {
    resetToIntro();
  }
};

/**
 * Continues to the next chapter in the story.
 */
const setNextChapter = () => {
  const newChapterIndex = getCurrentChapterIndex() + 1;

  // If the new chapter index is less than the total number of chapters, update the current chapter
  // (Then did not reach end of chapters)
  if (newChapterIndex < story.chapters.length) {
    updateChapter(newChapterIndex);
  }
};

/**
 * Resets the application to the introductory state.
 */
export function resetToIntro() {
  const { coords, cameraOptions } = story.properties;
  const { pitch, heading } = cameraOptions;

  setParams("chapterId", null); // Clear the chapter parameter
  setSelectedMarker(null); // "Deselect" current marker
  updateChapterContent(story.properties); // Update the chapter details content
  activateNavigationElement("intro"); // Activate the introduction navigation
  removeCustomRadiusShader(); // Remove the custom radius shader
  // Fly back to the starting position
  performFlyTo({
    coords,
    duration: 1,
    customOffset: {
      roll: 0,
      pitch: Cesium.Math.toRadians(pitch),
      heading,
    },
  });
}

/**
 * Updates the current chapter of the story based on the given chapter index.
 * @param {number} chapterIndex - The index of the chapter to be updated.
 */
export function updateChapter(chapterIndex) {
  const { coords, cameraOptions } = story.chapters[chapterIndex];
  const { pitch, heading } = cameraOptions;

  setSelectedMarker(chapterIndex); // Set the selected marker
  setParams("chapterId", story.chapters[chapterIndex].id); // Set the chapter parameter
  updateChapterContent(story.chapters[chapterIndex], false); // Update the chapter details content
  activateNavigationElement("details"); // Activate the details navigation
  createCustomRadiusShader(coords, HIGHLIGHT_RADIUS); // Create the custom radius shader
  // Fly to the new chapter location
  performFlyTo({
    coords,
    duration: 2,
    customOffset: {
      roll: 0,
      pitch: Cesium.Math.toRadians(pitch),
      heading,
    },
  });
}

/**
 * Sets the active classname on the navigation elements based on chapter presence.
 * @param {'intro' | 'details'} chapterParam - The navigation element to be toggled.
 */
export function activateNavigationElement(navName) {
  introNavigation.classList.toggle("active", navName === "intro");
  detailNavigation.classList.toggle("active", navName === "details");
}

/**
 * Returns the index of the current chapter.
 * @returns {number} - The index of the current chapter.
 */
export const getCurrentChapterIndex = () => {
  const params = getParams();
  return Number(params.get("chapterId"));
};

/**
 * Updates the details navigation. This includes the chapter index and
 * the forward button (if the current chapter is the last).
 */
function updateDetailsNavigation() {
  // Update chapter index
  const chapterIndex = getCurrentChapterIndex() + 1;
  // Displays the current chapter index
  detailNavigation.querySelector(
    "#chapter-index"
  ).textContent = `${chapterIndex} / ${story.chapters.length}`;

  // If the last chapter is reached, disable the forward button
  // Check if the current chapter is the last chapter
  if (chapterIndex === story.chapters.length) {
    // Disable the forward button
    forwardButton.disabled = true;
  } else {
    // Enable the forward button
    forwardButton.disabled = false;
  }
}

/**
 * Updates the content of the chapter detail section.
 * @param {Chapter} chapterData - The data object containing chapter details
 * @param {boolean} [isIntro=true] - Flag indicating if the current view is the introduction.
 */
export function updateChapterContent(chapterData, isIntro = true) {
  updateDetailsNavigation();
  const chapterDetail = document.querySelector(".chapter-detail");

  setTextContent(".story-title", isIntro ? "" : chapterData.title);
  setTextContent("h2", isIntro ? story.properties.title : chapterData.title);
  setTextContent(".description", isIntro ? story.properties.description : chapterData.content);
  setTextContent(".date", isIntro ? "" : chapterData.date);
  setTextContent(".place", chapterData.place);

  // Update image
  chapterDetail.querySelector(".hero").src = chapterData.imageUrl;

  // Update image credit
  const imageCredit = chapterData.imageCredit ? `Image credit: ${chapterData.imageCredit}` : "";
  setTextContent(".story-intro-attribution", isIntro ? imageCredit : "");
  setTextContent(".attribution", isIntro ? "" : imageCredit);

  // Update author and date in intro
  setTextContent(".story-intro-author", isIntro ? `by: ${story.properties.createdBy}` : "");
  setTextContent(".story-intro-date", isIntro ? story.properties.date : "");

  // Update chapter index and forward button state
  updateChapterIndexAndNavigation();
}

/**
 * Updates the chapter index display and the state of the forward navigation button.
 */
function updateChapterIndexAndNavigation() {
  const chapterIndex = getCurrentChapterIndex();
  const chapterIndexDisplay = `${chapterIndex + 1} / ${story.chapters.length}`;
  setTextContent("#chapter-index", chapterIndexDisplay);

  // Update forward button state
  forwardButton.disabled = chapterIndex + 1 === story.chapters.length;
}
