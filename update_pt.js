const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const fs = require('fs');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 连接MongoDB
const connectDB = async () => {
    try {
        if (mongoose.connections[0].readyState) {
            console.log('Using existing MongoDB connection');
            return;
        }

        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI is not defined in environment variables');
        }

        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};
const gameSchema = new mongoose.Schema({
    time: { type: Date, default: Date.now },
    players: [{
        name: String,
        score: Number,
        pt: Number
    }]
});
let Game = mongoose.models.Game || mongoose.model('Game', gameSchema);

const ptUtils = {
    calculateGamePtsFromScoresWithIndex(scoresWithIndex) {
        const basePTs = [45, 5, -15, -35];
        const indicesOfScore = (targetScore) => scoresWithIndex.map(({ score, index }) => score === targetScore ? index : null).filter(index => index !== null);
        return scoresWithIndex.map(({ score }) => {
            const umaIndices = indicesOfScore(score);
            const umaTotal = umaIndices.reduce((sum, index) => sum + basePTs[index], 0);
            const uma = umaTotal / umaIndices.length;
            const pt = (score - 30000) / 1000 + uma;
            return {
                score, pt
            };
        });
    },

    calculateGamePtsFromScores(scores) {
        scores = scores.sort((a, b) => b - a);
        const scoresWithIndex = scores.map((score, index) => ({ score, index }));
        return this.calculateGamePtsFromScoresWithIndex(scoresWithIndex);
    },
};
const updateGamesPt = async () => {
    try {
        await connectDB();

        // Find all games where at least one player is missing pt
        const gamesMissingPt = await Game.find({
            players: { $elemMatch: { pt: { $exists: false } } }
        });

        console.log(`Updating ${gamesMissingPt.length} games...`);

        for (const game of gamesMissingPt) {
            // Extract scores
            const scores = game.players.map(p => p.score);

            // Calculate pts using ptUtils
            const pts = ptUtils.calculateGamePtsFromScores(scores);

            // Assign pts back to players
            game.players = game.players.map((player, i) => ({
                ...player.toObject(), // convert Mongoose doc to plain object
                pt: pts[i].pt
            }));

            // Save the updated game
            await game.save();
            console.log(`Updated game ${game._id}`);
        }

        console.log('All games updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const findGamesMissingPt = async () => {
    try {
        await connectDB(); // ensure DB connection

        // Find all games where any player is missing pt
        const gamesMissingPt = await Game.find({
            players: { $elemMatch: { pt: { $exists: false } } }
        });

        console.log(`Found ${gamesMissingPt.length} games missing pt:`);
        gamesMissingPt.forEach(game => {
            console.log({
                _id: game._id,
                time: game.time,
                players: game.players
            });
        });

        process.exit(0); // optional: exit Node after finishing
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
const verifyGamesPt = async () => {
    try {
        await connectDB();

        // Fetch all games
        const games = await Game.find();

        let mismatches = 0;

        games.forEach(game => {
            const scores = game.players.map(p => p.score);
            const calculatedPts = ptUtils.calculateGamePtsFromScores(scores);

            game.players.forEach((player, i) => {
                const diff = Math.abs(player.pt - calculatedPts[i].pt);
                if (diff > 1e-6) { // small tolerance for floating point
                    console.log(
                        `Mismatch in game ${game._id}, player ${player.name}: existing pt=${player.pt}, expected pt=${calculatedPts[i].pt}`
                    );
                    mismatches++;
                }
            });
        });

        if (mismatches === 0) {
            console.log('All player.pt values match ptUtils calculations!');
        } else {
            console.log(`Found ${mismatches} mismatched player.pt values.`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

// Run the verification
verifyGamesPt();
