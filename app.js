const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(4003, () => {
      console.log("Server is running at http://localhost:4003");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertToObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertToObjectMatch = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

app.get("/players/", async (request, response) => {
  const getDBQuery = `
        SELECT * FROM player_details;
    `;
  const dbArray = await db.all(getDBQuery);
  response.send(dbArray.map((myArray) => convertToObject(myArray)));
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdQuery = `
        SELECT * FROM player_details
        WHERE player_id = ${playerId};
    `;
  const dbResponse = await db.get(getPlayerIdQuery);
  response.send(convertToObject(dbResponse));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updateDBQuery = `
        UPDATE player_details
        SET player_name = '${playerName}'
        WHERE player_id = ${playerId};`;
  const dbResponse = await db.run(updateDBQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
        SELECT * FROM match_details
        WHERE match_id = ${matchId};
    `;
  const dbArray = await db.get(getMatchQuery);
  response.send(convertToObjectMatch(dbArray));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchIdQuery = `
    SELECT match_details.match_id,match_details.match,match_details.year
    FROM 
        match_details JOIN player_match_score
        ON match_details.match_id = player_match_score.match_id
    WHERE 
        player_match_score.player_id = ${playerId};`;
  const dbResponse = await db.all(getMatchIdQuery);
  response.send(dbResponse.map((eachArray) => convertToObjectMatch(eachArray)));
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersQuery = `
        SELECT player_details.player_id,player_details.player_name 
        FROM player_details JOIN player_match_score
         ON player_details.player_id = player_match_score.player_id
        WHERE player_match_score.match_id  = ${matchId};
    `;
  const dbArray = await db.all(getPlayersQuery);
  response.send(dbArray.map((eachArray) => convertToObject(eachArray)));
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getTotalScoresQuery = `
        SELECT player_details.player_id,
            player_details.player_name,
            SUM(player_match_score.score),
            SUM(player_match_score.fours),
            SUM(player_match_score.sixes)
        FROM player_details INNER JOIN player_match_score
        ON player_details.player_id = player_match_score.player_id
        WHERE player_details.player_id = ${playerId};
    `;
  const playerScores = await db.get(getTotalScoresQuery);
  response.send({
    playerId: playerScores.player_id,
    playerName: playerScores.player_name,
    totalScore: playerScores["SUM(player_match_score.score)"],
    totalFours: playerScores["SUM(player_match_score.fours)"],
    totalSixes: playerScores["SUM(player_match_score.sixes)"],
  });
});
module.exports = app;
