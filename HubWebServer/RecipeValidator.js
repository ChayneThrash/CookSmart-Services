RecipeValidator = {

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
            &&
            (
                   ((instruction.heat !== 'Off' || !instruction.stir) && instruction.time > 0)
                || (instruction.heat === 'Off' && !instruction.stir && instruction.time === 0)
            )
            && this.cartridgesFieldValid(instruction.cartridges)
            && this.waterAmountFieldValid(instruction.waterAmount);
    },
    
    timeFieldValid: function(time) {
        var minTimeSec = 15;
        var maxTimeSec = 14400; //4 hours
        
        return time >= 0
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
    }
	
}

module.exports = RecipeValidator;