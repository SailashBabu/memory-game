const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.post("/save", async(req,res)=>{
    try{
        const {theme, level, time, attempts} = req.body;

        const newUser = new User({theme, level, time, attempts});
        await newUser.save();
        res.status(201).json({message : "Game data saved successfully!"});
    }catch(err){
        res.status(500).json({error: "Failed to save game data",details:err.message});
    }
});

router.get("/all", async(req,res)=>{
    try{
        const userData = await User.find();
        res.status(200).json(userData);
    }catch(err){
        res.status(500).json({error:"Failed to fetch game data",details:err.message});
    }
});

module.exports = router;
