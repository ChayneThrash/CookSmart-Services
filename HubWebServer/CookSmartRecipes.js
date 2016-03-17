var CookSmartRecipes = {

    isValid: function(recipe) {
        if (recipe.length === 0) {
            return false;
        }
        for(var i = 0; i < recipe.length; ++i) {
            if (!this.instructionValid(recipe[i])) {
                return false;
            }
        }
        return true;
    },
    
    instructionValid: function(instruction) {
        return instruction.hasOwnProperty('time')
            && instruction.hasOwnProperty('heat')
            && instruction.hasOwnProperty('stir')
            && instruction.hasOwnProperty('cartridges')
            && instruction.hasOwnProperty('waterAmount')
            && this.timeFieldValid(instruction.time)
            && this.heatFieldValid(instruction.heat)
            && this.cartridgesFieldValid(instruction.cartridges)
            && this.waterAmountFieldValid(instruction.waterAmount);
    },
    
    timeFieldValid: function(time) {
        var minTimeSec = 15;
        var maxTimeSec = 14400; //4 hours
        
        return time >= minTimeSec
            && time <= maxTimeSec
            && (time % minTimeSec) === 0; 
    },
    
    heatFieldValid: function(heat) {
        var allowedHeatSettings = ['Off', 'Warm', 'Low', 'Med-Low', 'Med', 'Med-High', 'High'];
        return allowedHeatSettings.indexOf(heat) > -1;
    },
    
    cartridgesFieldValid: function(cartridges) {
        var numCartridges = 12;
        if (cartridges.length > numCartridges) {
            return false;
        }
        for(var i = 0; i < cartridges.length; ++i) {
            if (cartridges[i] < 1 || cartridges[i] > numCartridges) {
                return false;
            }
        }
        return true;
    },
    
    waterAmountFieldValid: function(waterAmount) {
        var minAmount = 1; // 8th of a cup
        var maxAmount = 32; // 4 cups
        return waterAmount >= minAmount
            && waterAmount <= maxAmount;
    },    
    
    format: function(recipe) {
        var formattedRecipe = [];
        for(var i = 0; i < recipe.length; ++i) {
            if (recipe[i].waterAmount !== 0) {
                formattedRecipe.push({
                    type: 'Add Water',
                    amount: recipe[i].waterAmount
                });
            }
            for (var j = 0; j < recipe[i].cartridges.length; ++j) {
                formattedRecipe.push({
                   type: 'Drop Cartridge',
                   cartridge: recipe[i].cartridges[j]
                });
            }
            if (recipe[i].heat !== 'Off') {
                formattedRecipe.push({
                   type: 'Heat',
                   time: recipe[i].time,
                   temperature: recipe[i].heat,
                   concurrent: recipe[i].stir //If we're going to stir, it won't be concurrent so that we wait.
                });
            }
            if (recipe[i].stir) {
                formattedRecipe.push({
                    type: 'Stir',
                    time: recipe[i].time,
                    concurrent: false //Stirring is never concurrent to prevent going to the next section.
                });
            }
        }
        return formattedRecipe;
    },
    
    serialize: function(recipe) {
        var serializedRecipe = [];
        for(var i = 0; i < recipe.length; ++i) {
            var serializedInstruction = new Uint8Array(3); //Our packet is 24 bits.
            serializedInstruction[2] = 0 | (this.getSerializedInstructionType(recipe[i].type) << 3) | this.getTopThreeFieldBits(recipe[i]);
            serializedInstruction[1] = this.getSerializedInstructionSecondByteField(recipe[i]);
            serializedInstruction[0] = this.getSerializedInstructionsThirdByteField(recipe[i]);
            serializedRecipe.push(serializedInstruction);
        }
        return serializedRecipe;
    },
    
    getSerializedInstructionType: function(instructionType) {
        switch (instructionType) {
            case 'Add Water': return 0; //00
            case 'Drop Cartridge': return 1; //01
            case 'Heat': return 2; //10
            case 'Stir': return 3; //11
        }
    },
    
    getTopThreeFieldBits: function(instruction) {
        var temperatureMap = {
            Warm: 0,
            Low: 1,
            "Med-Low": 2,
            Med: 3,
            "Med-High": 4,
            High: 5
        }
        switch (instruction.type) {
            case 'Add Water': return (instruction.amount & 28) >> 2; //amount is 5 bits. Get bits 4, 3, and 2.
            case 'Drop Cartridge': return (instruction.cartridge & 14) >> 1; //field is 4 bits. Get bits 3, 2, and 1.
            case 'Heat': return (temperatureMap[instruction.temperature]); //temperature field is only 3 bits so it can just be returned.
            case 'Stir': return 0; //time will consistently be at the beginning of the second byte so we'll just zero out the last three here.
        }
    },
    
    getSerializedInstructionSecondByteField: function(instruction) {
        switch (instruction.type) {
            case 'Add Water': return (instruction.amount & 3) << 6; //amount is 5 bits. Get bits 1 and 0.
            case 'Drop Cartridge': return (instruction.cartridge & 1) << 7; //field is 4 bits. Get bit 0.
            case 'Heat':  //Let it fall through since both use time here.
            case 'Stir': return (instruction.time & 32640) >> 7; //time field is 15 bit. Get bits 14 - 7.
        }       
    },
    
    getSerializedInstructionsThirdByteField: function(instruction) {
        switch (instruction.type) {
            case 'Add Water': //fall through since it's the same.
            case 'Drop Cartridge': return 0; //fields have already been encoded. These fields aren't concurrent
            case 'Heat':  //Let it fall through since both use time here.
            case 'Stir': return ((instruction.time & 127) << 1) | (instruction.concurrent ? 1 : 0) //Get bits 6 - 0 and append concurrent flag.
        }       
    }
}

module.exports = CookSmartRecipes;