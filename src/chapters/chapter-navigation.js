import { story } from "../main.js";
import { performFlyTo } from "../utils/cesium.js";
import { getParams, setParams } from "../utils/params.js";
import { loadSvg } from "../utils/svg.js";

/**
 * The time in milliseconds between each chapter progression
 * @type {number}
 * @readonly
 */
const TIME_PER_CHAPTER = 3000;

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
const playButton = detailNavigation.querySelector("#play-story");

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
  const chapterParam = params.get("chapter");
  //Finds and returns a chapter from the story based on its title.
  const chapterData = story.chapters.find(
    (chapter) => chapter.title === chapterParam
  );

  // Set up event listeners
  startButton.addEventListener("click", () => {
    toggleNavigationElements(true);
    updateChapter(0);
  });

  forwardButton.addEventListener("click", () => {
    setNextChapter();
    stopProgression();
  });

  backButton.addEventListener("click", () => {
    setPreviousChapter();
    stopProgression();
  });

  playButton.addEventListener("click", startStoryProgression);

  // Initialize chapter content based on URL parameters
  chapterData
    ? toggleNavigationElements(true)
    : toggleNavigationElements(false);

  updateChapterContent(chapterData || story.properties, !chapterData);
}

/**
 * Stops the progression of the function.
 */
async function stopProgression() {
  const playIcon = await loadSvg("round-play-button");
  playButton.innerHTML = playIcon;

  clearTimeout(intervalId);
  intervalId = null;
}

/**
 * Progresses to the next chapter and stops progression if the current chapter is the last one.
 *
 * @param {type} paramName - description of parameter
 * @return {type} description of return value
 */
function progress() {
  setNextChapter();
  if (getCurrentChapterIndex() === story.chapters.length - 1) {
    stopProgression();
  }
}

/**
 * Starts the progression of the story.
 *
 * @return {Promise<void>} This function does not return anything.
 */
async function startStoryProgression() {
  const pauseIcon = await loadSvg("round-pause-button");

  // Set up the interval
  if (intervalId) {
    // If the interval is already active, stop it
    stopProgression();
  } else {
    // If the interval is not active, start it
    intervalId = setInterval(progress, TIME_PER_CHAPTER);
    playButton.innerHTML = pauseIcon;
  }
}

/**
 * Sets the previous chapter as the current chapter.
 */
const setPreviousChapter = () => {
  const newChapterIndex = getCurrentChapterIndex() - 1;

  if (newChapterIndex >= 0) {
    updateChapter(newChapterIndex);
  } else {
    resetToIntro();
  }
};

/**
 * Continues to the next chapter in the story.
 */
const setNextChapter = () => {
  const newChapterIndex = getCurrentChapterIndex() + 1;

  if (newChapterIndex < story.chapters.length) {
    updateChapter(newChapterIndex);
  }
};

export function resetToIntro() {
  setParams("chapter", null);
  updateChapterContent(story.properties);
  toggleNavigationElements(null);
  performFlyTo(story.properties.coords, {
    duration: 1,
  });
}

export function updateChapter(chapterIndex) {
  const coords = story.chapters[chapterIndex].coords;

  setParams("chapter", story.chapters[chapterIndex].title);
  updateChapterContent(story.chapters[chapterIndex], false);
  performFlyTo(coords, {
    duration: 2,
  });
}

/**
 * Toggles the active state of navigation elements based on chapter presence.
 * @param {string|null} chapterParam - The current chapter parameter.
 */
export function toggleNavigationElements(chapterParam) {
  introNavigation.classList.toggle("active", !chapterParam);
  detailNavigation.classList.toggle("active", Boolean(chapterParam));
}

/**
 * Returns the index of the current chapter.
 * @returns {number} - The index of the current chapter.
 */
const getCurrentChapterIndex = () => {
  const params = getParams();
  const chapterParam = params.get("chapter");
  return story.chapters.findIndex((chapter) => chapter.title === chapterParam);
};

/**
 * Updates the content of the chapter detail section.
 * @param {Chapter} chapterData - The data object containing chapter details
 * @param {boolean} [isIntro=true] - Flag indicating if the current view is the introduction.
 */
export function updateChapterContent(chapterData, isIntro = true) {
  const chapterDetail = document.querySelector(".chapter-detail");

  chapterDetail.querySelector(".story-title").textContent = isIntro
    ? ""
    : story.properties.title;

  chapterDetail.querySelector("h2").textContent = isIntro
    ? story.properties.title
    : chapterData.title;

  chapterDetail.querySelector(".description").textContent = isIntro
    ? story.properties.description
    : chapterData.content;

  chapterDetail.querySelector(".date").textContent = chapterData.date;
  chapterDetail.querySelector(".place").textContent = chapterData.place;
  chapterDetail.querySelector(".hero").src = chapterData.imageUrl;

  const imageCredit = isIntro
    ? story.properties.createdBy
    : `Image credit: ${chapterData.imageCredit}`;

  chapterDetail.querySelector(".attribution").textContent = imageCredit;

  // update chapter index
  const chapterIndex = getCurrentChapterIndex();
  const chapterIndexDisplay = `${chapterIndex + 1} / ${story.chapters.length}`;
  detailNavigation.querySelector("#chapter-index").textContent =
    chapterIndexDisplay;

  // if the last chapter is reached, disable the forward button
  // Check if the current chapter is the last chapter
  if (chapterIndex + 1 === story.chapters.length) {
    // Disable the forward button
    forwardButton.disabled = true;
  } else {
    // Enable the forward button
    forwardButton.disabled = false;
  }
}
