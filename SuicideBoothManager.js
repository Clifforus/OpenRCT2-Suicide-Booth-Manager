// Script that automatically manages the exits of suicide booth rides in the event of a breakdown

var suicideBoothsIndex = []

var main = function() {

	// Display message when script is loaded
	try {
		park.postMessage({
			type: "award",
			text: "Suicide Booth Exit Manager is initialised. Happy euthanising!"
		});
	} catch(error) {
		console.log(error);
	}

	// Runs every tick

	var actionSubscription = context.subscribe('interval.tick', function() {

		breakdownCheck()
		repairedCheck()
	} )
}

function breakdownCheck() {

	for (var i = 0; i < map.numRides; i++) {

		// Convert lifecycleFlags to binary

		flagsBin = map.rides[i].lifecycleFlags.toString(2)

		// Check the seventh bit

		seventhBit = flagsBin.length - 7

		breakdownFlag = flagsBin.charAt(seventhBit)

		// Check if ride is already on the list of broken down suicide booths

		isAlreadyOnList = 0

		for ( var j = 0; j < suicideBoothsIndex.length; j++) {

			if ( i == suicideBoothsIndex[j].rIndex ) {

				isAlreadyOnList = 1
			}
		}

		// If breakdown flag is 1, look for suicide exits unless ride is already on the list of broken down suicide booths

		if (breakdownFlag == 1 && isAlreadyOnList == 0 ) {

			suicideExitCheck(i)
		}			
	}
};

function suicideExitCheck(rideIndex) {

	for (var j = 0; j < map.rides[rideIndex].stations.length; j++) {

		currentStation = map.rides[rideIndex].stations[j]

		if (currentStation.exit != null) {

			// Get XYZD coords for exit

			// Directions reference		XY reference		Height reference

			// 0 = positive X		1 tile = 32x32		1.5m = 8
			// 1 = negative Y 
			// 2 = negative X 
			// 3 = positive Y

			exitX = currentStation.exit.x
			exitY = currentStation.exit.y
			exitZ = currentStation.exit.z
			exitD = currentStation.exit.direction

			// Get XY coords for tile outside of exit

			pathX = exitX/32
			pathY = exitY/32

			if ( exitD == 0) { pathX = pathX + 1 }
			if ( exitD == 1) { pathY = pathY - 1 }
			if ( exitD == 2) { pathX = pathX - 1 }
			if ( exitD == 3) { pathY = pathY + 1 }

			// Determine ground height of tile outside of exit

			pathTile = map.getTile(pathX, pathY)

			surfIndex = 0
			surfHeightRequirement = 0
			pathNullify = 0

			for ( k = 0; k < pathTile.elements.length; k++) {

				elementType = pathTile.elements[k].type
				elementHeight = pathTile.elements[k].baseHeight

				// Check if surface height is high enough for a suicide exit

				if ( elementType == 'surface' && elementHeight > exitZ/8 + 2 ) { 

					surfIndex = k
					surfHeightRequirement = 1
				}

				// Make sure a path piece isn't there

				if ( elementType == 'footpath' && elementHeight == exitZ/8 ) {

					pathNullify = 1
				}

			}

			if ( surfHeightRequirement == 1 && pathNullify == 0 ) {

				// If broken down ride has suicide exit(s), add it to the list of broken down suicide booths

				var suicideBooth = {

					rIndex: rideIndex,
					sIndex: surfIndex,
					pHeight: exitZ/8,
					pTileX: pathTile.x,
					pTileY: pathTile.y,
					mechanic: null,
				}

				suicideBoothsIndex.push(suicideBooth)

				console.log('Suicide exit found! Ride '+rideIndex+' added to suicide booths index')

				addPath(rideIndex, pathTile, surfIndex)

			}					
		}
	}
};

function addPath(rideIndex, pathTile, surfIndex) {

	// Add path for mechanic

	pathTile.insertElement(surfIndex)

	pathTile.elements[surfIndex].type = 'footpath'
	pathTile.elements[surfIndex].baseHeight = exitZ/8
	pathTile.elements[surfIndex].clearanceHeight = exitZ/8 + 4
	pathTile.elements[surfIndex].edgesAndCorners = 1 | 2 | 4 | 8

	// God fucking damn this naming

	suicideIndexIndex = 0

	// Get index of the suicide booths index entry for the ride with index rideIndex haha kill me
	// Suicide Booth 1 was great!
	
	for (i = 0; i < suicideBoothsIndex.length ; i++ ) {

		if ( suicideBoothsIndex[i].rideIndex == rideIndex ) {

			suicideIndexIndex = i
		}
	}

	// Make surrounding existing paths connect up

	surroundingPathTile1 = map.getTile(pathX+1, pathY)

	for ( i = 0; i < surroundingPathTile1.elements.length; i++ ) {

		if ( surroundingPathTile1.elements[i].type == 'footpath' ) {

			suicideBoothsIndex[suicideIndexIndex].path1edges = surroundingPathTile1.elements[i].edgesAndCorners

			surroundingPathTile1.elements[i].edgesAndCorners = 1 | 2 | 4 | 8

		}
	}

	surroundingPathTile2 = map.getTile(pathX-1, pathY)

	for ( i = 0; i < surroundingPathTile2.elements.length; i++ ) {

		if ( surroundingPathTile2.elements[i].type == 'footpath' ) {

			suicideBoothsIndex[suicideIndexIndex].path2edges = surroundingPathTile2.elements[i].edgesAndCorners

			surroundingPathTile2.elements[i].edgesAndCorners = 1 | 2 | 4 | 8
		}
	}

	surroundingPathTile3 = map.getTile(pathX, pathY+1)

	for ( i = 0; i < surroundingPathTile3.elements.length; i++ ) {

		if ( surroundingPathTile3.elements[i].type == 'footpath' ) {

			suicideBoothsIndex[suicideIndexIndex].path1edges = surroundingPathTile3.elements[i].edgesAndCorners
	
			surroundingPathTile3.elements[i].edgesAndCorners = 1 | 2 | 4 | 8
		}
	}

	surroundingPathTile4 = map.getTile(pathX, pathY-1)

	for ( i = 0; i < surroundingPathTile4.elements.length; i++ ) {

		if ( surroundingPathTile4.elements[i].type == 'footpath' ) {

			suicideBoothsIndex[suicideIndexIndex].path1edges = surroundingPathTile4.elements[i].edgesAndCorners

			surroundingPathTile4.elements[i].edgesAndCorners = 1 | 2 | 4 | 8
		}
	}
};

function repairedCheck() {


	for ( i = 0; i < suicideBoothsIndex.length; i++ ) {

		suicideBooth = suicideBoothsIndex[i]

		// Convert lifecycleFlags to binary

		flagsBin = map.rides[suicideBooth.rIndex].lifecycleFlags.toString(2)

		// Check the seventh bit

		seventhBit = flagsBin.length - 7

		breakdownFlag = flagsBin.charAt(seventhBit)

		// If breakdown flag is 0, remove exit path

		if ( breakdownFlag == 0 ) {

			pathTile = map.getTile(suicideBooth.pTileX, suicideBooth.pTileY)

			for ( j = 0; j < pathTile.elements.length; j++ ) {

				if ( pathTile.elements[j].type == 'footpath' && pathTile.elements[j].baseHeight == suicideBooth.pHeight ) {

					pathTile.removeElement(j)
				}
			}

			// TODO: implement mechanic rescue

			suicideBoothsIndex.splice(i, 1)

			console.log('Ride '+i+' has been repaired and removed from the suicide booths index')

		}	
	}
};


registerPlugin({
    name: 'Suicide Booth Manager',
    version: '0.0.1',
    authors: ['Clifforus'],
    type: 'remote',

    main: main
});
