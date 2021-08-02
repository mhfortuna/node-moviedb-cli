#!/usr/bin/env node
const { Command } = require("commander");
const chalk = require("chalk");
require("dotenv").config();
const request = require("./utils/requestsMethods");
const render = require("./utils/renderMethods");
const fileSystem = require("./utils/fileSystemMethods");
const { spinner } = require("./utils/spinner");
const { notify } = require("./utils/notifier");

const program = new Command();

program.version("0.0.1");

program
  .command("get-persons")
  .description("Make a network request to fetch most popular persons")
  .requiredOption(
    "--page <number>",
    "The page of persons data results to fetch"
  )
  .requiredOption("-p, --popular", "Fetch the popular persons")
  .option("--save", "Save the persons to /files/persons")
  .option("--local", "Fetch the persons from /files/persons")
  .action((options) => getPersons(options.page, options.local, options.save));

program
  .command("get-person")
  .description("Make a network request to fetch the data of a single person")
  .requiredOption("-i, --id <number> ", "The id of the person")
  .option("--save", "Save the movies to /files/movies")
  .option("--local", "Fetch the movies from /files/movies")
  .action((options) => {
    getPerson(options.id, options.local, options.save);
  });

program
  .command("get-movies")
  .description("Make a network request to fetch movies")
  .requiredOption("--page <number>", "The page of movies data results to fetch")
  .option("-p, --popular", "Fetch the popular movies")
  .option("-n, --now-playing", "Fetch the movies that are playing now")
  .option("--save", "Save the movies to /files/movies")
  .option("--local", "Fetch the movies from /files/movies")
  .action((options) =>
    getMovies(options.page, options.local, options.nowPlaying, options.save)
  );

program
  .command("get-movie")
  .description("Make a network request to fetch the data of a single person")
  .requiredOption("-i, --id <number>", "The id of the movie")
  .option("--save", "Save the movies to /files/movies")
  .option("--local", "Fetch the movies from /files/movies")
  .option("-r, --reviews", "Fetch the reviews of the movie")
  .action((options) => {
    getMovie(options.id, options.reviews);
  });

program
  .command("interactive")
  .description("Interactive way to make the same requests")
  .action(async function handleAction() {
    const inquirer = require("inquirer");

    await inquirer
      .prompt([
        {
          type: "list",
          name: "actionOption",
          message: "What do you want fetch?",
          choices: [
            "Popular movies",
            "Now playing movies",
            "A specific movie",
            "Popular persons",
            "A specific person",
          ],
        },
        {
          type: "confirm",
          name: "fetchOption",
          message:
            "Do you want to fetch it from the web? The alternative is from a JSON stored",
          default: true,
        },
      ])
      .then(async (answers) => {
        if (answers["fetchOption"] === true) {
          await inquirer
            .prompt([
              {
                type: "confirm",
                name: "saveOption",
                message: "Do you want to save it to a file? (no by default)",
                default: false,
              },
            ])
            .then(async (saveAnswer) => {
              answers = { ...answers, ...saveAnswer };
              switch (answers["actionOption"]) {
                case "Popular movies":
                case "Now playing movies":
                case "Popular persons":
                  await inquirer
                    .prompt([
                      {
                        type: "number",
                        name: "page",
                        message: "What page do you want to fetch?",
                        default: 1,
                        validate(value) {
                          if (value === parseInt(value)) {
                            return true;
                          } else {
                            return "The page number must be a number";
                          }
                        },
                      },
                    ])
                    .then((answerPage) => {
                      answers = { ...answers, ...answerPage };
                    });
                  break;
                case "A specific movie":
                  await inquirer
                    .prompt([
                      {
                        type: "number",
                        name: "movieId",
                        message: "Id of the movie to fetch:",
                        validate(value) {
                          if (value === parseInt(value)) {
                            return true;
                          } else {
                            return "The id must be a number";
                          }
                        },
                      },
                      {
                        type: "confirm",
                        name: "reviewOption",
                        message:
                          "Do you want to see the movie reviews also? (no by default)",
                        default: false,
                      },
                    ])
                    .then((movieAnswers) => {
                      answers = { ...answers, ...movieAnswers };
                    });

                case "A specific person":
                  await inquirer
                    .prompt([
                      {
                        type: "number",
                        name: "personId",
                        message: "Id of the person to fetch:",
                        validate(value) {
                          if (value === parseInt(value)) {
                            return true;
                          } else {
                            return "The id must be a number";
                          }
                        },
                      },
                    ])
                    .then((movieAnswers) => {
                      answers = { ...answers, ...movieAnswers };
                    });

                default:
                  break;
              }
            });
        } else {
        }
        const {
          page,
          fetchOption,
          actionOption,
          saveOption,
          movieId,
          reviewOption,
          personId,
        } = answers;
        const isLocal = !fetchOption;
        const isNowPlaying = actionOption === "Now playing movies";
        switch (answers["actionOption"]) {
          case "Popular movies":
          case "Now playing movies":
            getMovies(page, isLocal, isNowPlaying, saveOption);
            break;
          case "A specific movie":
            getMovie(movieId, reviewOption, isLocal, saveOption);
            break;
          case "Popular persons":
            getPersons(page, isLocal, saveOption);
            break;
          case "A specific person":
            getPerson(personId, isLocal, saveOption);
            break;

          default:
            break;
        }
      })
      .catch((error) => {
        console.log(error);
      });
  });

//TODO error on unknown commands

program.parse(process.argv);

async function getMovies(page, isLocal, isNowPlaying, isSave) {
  spinner.start(
    `${chalk.bold(`${chalk.yellow("Fetching the movies data...")}`)}`
  );
  page = parseInt(page);
  let moviesJson = {};
  let spinnerText = "";
  try {
    if (isLocal === true) {
      if (isNowPlaying === true) {
        moviesJson = await fileSystem.loadMovies(isNowPlaying);
        spinnerText = "Movies playing now data loaded";
      } else {
        moviesJson = await fileSystem.loadMovies(isNowPlaying);
        spinnerText = "Popular movies data loaded";
      }
    } else {
      if (isNowPlaying === true) {
        moviesJson = await request.getNowPlayingMovies(page);
        spinnerText = "Movies playing now data loaded";
      } else {
        moviesJson = await request.getPopularMovies(page);
        spinnerText = "Popular movies data loaded";
      }
    }
    if (isSave === true) {
      await fileSystem.saveMovies(moviesJson, isNowPlaying);
      spinnerText += " and saved to file/movies";
      notify("Movies saved to file!");
    } else {
      render.renderMovies(
        moviesJson.page,
        moviesJson.total_pages,
        moviesJson.results
      );
    }
    spinner.succeed(spinnerText);
  } catch (error) {
    setTimeout(() => {
      spinner.fail(chalk.bold(chalk.red(error)));
    }, 1000);
  }
}

async function getMovie(id, isReviews) {
  spinner.start(
    `${chalk.bold(`${chalk.yellow("Fetching the movie data...")}`)}`
  );
  const movieId = parseInt(id);
  try {
    const singleMovieJson = await request.getMovie(movieId);
    render.renderSingleMovie(singleMovieJson);
    if (isReviews === true) {
      const movieId = parseInt(id);
      const movieReviewsJson = await request.getMovieReviews(movieId);
      render.renderReviews(movieReviewsJson);
      spinner.succeed("Movie reviews data loaded");
    } else {
      spinner.succeed("Movie data loaded");
    }
  } catch (error) {
    setTimeout(() => {
      spinner.fail(chalk.bold(chalk.red(error)));
    }, 1000);
  }
}

async function getPersons(page, isLocal, isSave) {
  spinner.start(
    `${chalk.bold(`${chalk.yellow(" Fetching the popular person's data...")}`)}`
  );
  page = parseInt(page);
  try {
    if (isLocal === true) {
      const json = await fileSystem.loadPopularPersons();

      render.renderPersons(json);
      spinner.succeed("Popular Persons data loaded");
    } else if (isSave === true) {
      const json = await request.getPopularPersons(page);
      await fileSystem.savePopularPersons(json);
      spinner.succeed(
        "Popular Persons data saved to src/files/popular-persons.json"
      );
      notify("Persons saved to file!");
    } else {
      const json = await request.getPopularPersons(page);
      render.renderPersons(json);
      spinner.succeed("Popular Persons data loaded");
    }
  } catch (error) {
    setTimeout(() => {
      spinner.fail(chalk.bold(chalk.red(error)));
    }, 1000);
  }
}

async function getPerson(id, isLocal, isSave) {
  try {
    let json = {};
    spinner.start(
      `${chalk.bold(`${chalk.yellow("Fetching the person's data...")}`)}`
    );
    const personId = parseInt(id);
    if (isLocal === true) {
      json = await fileSystem.loadPerson();
    } else {
      json = await request.getPerson(personId);
    }
    if (isSave === true) {
      await fileSystem.savePerson(json);
      spinner.succeed("Person data saved to file");
    } else {
      render.renderPersonDetails(json);
      spinner.succeed("Person data loaded");
    }
  } catch (error) {
    setTimeout(() => {
      spinner.fail(chalk.bold(chalk.red(error)));
    }, 1000);
  }
}
