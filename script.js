// Game State Variables
let boardWidth = 8; // Example board size
let boardHeight = 8;
let board = []; // 2D array representing the board
let candies = ["🍭", "🐻‍❄️", "✨", "💧", "❄️"]; // Blue-themed candy emojis
let score = 0;
let level = 1;
let moves = 30; // Example initial moves (for move-limited mode)

let selectedCandyElement = null; // DOM element of the selected candy
let selectedCandyPosition = { row: -1, col: -1 }; // Position {row, col}

// Get DOM elements
const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const movesDisplay = document.getElementById('moves');
const startButton = document.getElementById('start-button');
const messageArea = document.querySelector('.message-area'); // Use querySelector for class

// --- Initialization ---
function initGame() {
    score = 0;
    level = 1;
    moves = 30; // Reset moves
    updateScoreDisplay();
    updateLevelDisplay();
    updateMovesDisplay();
    createBoard();
    // Start game loop or wait for button press
    // For now, let's start immediately after board creation
    startButton.style.display = 'none'; // Hide start button after init
    // Initial check for matches after filling the board
    // We need to resolve any initial matches so the board starts clean
    resolveInitialMatches(); 
}

function createBoard() {
    gameBoard.innerHTML = ''; // Clear previous board
    gameBoard.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`; // Set CSS grid columns

    board = []; // Reset board array
    for (let r = 0; r < boardHeight; r++) {
        board[r] = [];
        for (let c = 0; c < boardWidth; c++) {
            // Place a random candy initially, ensuring no immediate matches of 3+
            let candyType;
             do {
                candyType = candies[Math.floor(Math.random() * candies.length)];
             } while (
                (c >= 2 && board[r][c - 1] === candyType && board[r][c - 2] === candyType) || // Check horizontal match left
                (r >= 2 && board[r - 1][c] === candyType && board[r - 2][c] === candyType)    // Check vertical match up
             );

            board[r][c] = candyType;
            const candyElement = createCandyElement(candyType, r, c);
            gameBoard.appendChild(candyElement);
        }
    }
}

function createCandyElement(candyType, row, col) {
    const element = document.createElement('div');
    element.classList.add('candy');
    element.textContent = candyType;
    element.dataset.row = row;
    element.dataset.col = col;
    element.addEventListener('click', handleCandyClick);
    // You could add background images here based on candyType instead of just text
    // element.style.backgroundImage = `url('images/${candyType}.png')`; 
    return element;
}

function updateScoreDisplay() {
    scoreDisplay.textContent = `Score: ${score}`;
}

function updateLevelDisplay() {
    levelDisplay.textContent = `Level: ${level}`;
}

function updateMovesDisplay() {
     movesDisplay.textContent = `Moves: ${moves}`;
}

// --- Game Loop & Logic ---

// This loop finds, removes, cascades, and fills until no more matches exist
async function resolveInitialMatches() {
    let matchesFound = true;
    while(matchesFound) {
        matchesFound = false;
        let matches = findMatches();
        if (matches.length > 0) {
             matchesFound = true;
             // Delay visually before removing
             await new Promise(resolve => setTimeout(resolve, 300)); 
             removeMatches(matches);
             // Delay for removal animation
             await new Promise(resolve => setTimeout(resolve, 500)); 
             cascadeCandies();
             // Delay for cascading animation
             await new Promise(resolve => setTimeout(resolve, 500)); 
             fillBoard();
             // Delay for filling animation
             await new Promise(resolve => setTimeout(resolve, 500));
             // Update board elements in DOM after cascade/fill
             updateBoardDOM();
             // Score update happens in removeMatches
        }
    }
    console.log("Initial board resolved. Ready to play!");
    showMessage("Ready!", 1000);
}


async function handleCandyClick(event) {
    const clickedElement = event.target;
    const row = parseInt(clickedElement.dataset.row);
    const col = parseInt(clickedElement.dataset.col);

    if (selectedCandyElement === null) {
        // First candy selected
        selectedCandyElement = clickedElement;
        selectedCandyPosition = { row, col };
        clickedElement.classList.add('selected');
    } else {
        // Second candy selected
        const isAdjacent = (
            (Math.abs(row - selectedCandyPosition.row) === 1 && col === selectedCandyPosition.col) || // Vertical
            (Math.abs(col - selectedCandyPosition.col) === 1 && row === selectedCandyPosition.row)   // Horizontal
        );

        // Deselect previous
        selectedCandyElement.classList.remove('selected');

        if (isAdjacent) {
            // Attempt Swap
            await attemptSwap(selectedCandyPosition, { row, col });

        } else {
            // Clicked a non-adjacent candy, select it instead
            selectedCandyElement = clickedElement;
            selectedCandyPosition = { row, col };
            clickedElement.classList.add('selected');
        }
         // Reset selected after attemptSwap or re-selection
        if (!isAdjacent) {
             // If not adjacent, we just re-selected, so keep one selected
        } else {
             selectedCandyElement = null;
             selectedCandyPosition = { row: -1, col: -1 };
        }

    }
}

async function attemptSwap(pos1, pos2) {
    // Temporarily swap in the board array
    const candy1 = board[pos1.row][pos1.col];
    const candy2 = board[pos2.row][pos2.col];
    board[pos1.row][pos1.col] = candy2;
    board[pos2.row][pos2.col] = candy1;

    // Visually swap elements using their text content/data attributes (simpler than moving DOM nodes)
    const element1 = getCandyElementByPosition(pos1.row, pos1.col);
    const element2 = getCandyElementByPosition(pos2.row, pos2.col);

    // Use a temporary holder for swapping data attributes/textContent
    const tempText = element1.textContent;
    const tempRow = element1.dataset.row;
    const tempCol = element1.dataset.col;

    element1.textContent = element2.textContent;
    element1.dataset.row = element2.dataset.row;
    element1.dataset.col = element2.dataset.col;

    element2.textContent = tempText;
    element2.dataset.row = tempRow;
    element2.dataset.col = tempCol;
    // Note: Actual DOM element positions haven't changed, only their content/data.
    // We update the board array to match the *logical* swap.
    // The getCandyElementByPosition relies on the data-row/data-col attributes.


    // Check for matches after the swap
    let matches = findMatches();

    if (matches.length > 0) {
        // Valid swap - process matches!
        showMessage("Match!", 800);
        moves--; // Decrement moves on a successful swap
        updateMovesDisplay();

        // Process loop: remove -> cascade -> fill -> check again
        let moreMatches = true;
        while(moreMatches) {
             // Add slight delays for animations
             await new Promise(resolve => setTimeout(resolve, 300));
             removeMatches(matches);
             await new Promise(resolve => setTimeout(resolve, 500));
             cascadeCandies();
             await new Promise(resolve => setTimeout(resolve, 500));
             fillBoard();
             await new Promise(resolve => setTimeout(resolve, 500));
             // Update DOM elements after changes
             updateBoardDOM();
             matches = findMatches();
             moreMatches = matches.length > 0;
             if (moreMatches) showMessage("Combo!", 800);
        }
        // After the loop, check win/loss condition
        checkGameEnd();

    } else {
        // Invalid swap - no match
        showMessage("No Match", 800);
        // Swap back immediately
        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay before swapping back
        // Swap back visually
         const tempText2 = element1.textContent;
         const tempRow2 = element1.dataset.row;
         const tempCol2 = element1.dataset.col;

         element1.textContent = element2.textContent;
         element1.dataset.row = element2.dataset.row;
         element1.dataset.col = element2.dataset.col;

         element2.textContent = tempText2;
         element2.dataset.row = tempRow2;
         element2.dataset.col = tempCol2;

        // Swap back in the array
        board[pos1.row][pos1.col] = candy1;
        board[pos2.row][pos2.col] = candy2;
    }

    // Ensure no candy remains selected
    if(selectedCandyElement) {
         selectedCandyElement.classList.remove('selected');
         selectedCandyElement = null;
         selectedCandyPosition = { row: -1, col: -1 };
    }
}


function findMatches() {
    const matches = []; // Stores positions {row, col} of candies in matches

    // Check horizontal matches
    for (let r = 0; r < boardHeight; r++) {
        let sequence = 0;
        for (let c = 0; c < boardWidth; c++) {
            if (board[r][c] && c > 0 && board[r][c] === board[r][c - 1]) {
                sequence++;
            } else {
                if (sequence >= 2) { // Found a match of 3 or more ending at c-1
                    for (let i = 0; i <= sequence; i++) {
                        matches.push({ row: r, col: c - 1 - i });
                    }
                }
                sequence = 0; // Reset sequence
            }
        }
        // Check if sequence ends at the edge of the board
        if (sequence >= 2) {
             for (let i = 0; i <= sequence; i++) {
                matches.push({ row: r, col: boardWidth - 1 - i });
            }
        }
    }

    // Check vertical matches
    for (let c = 0; c < boardWidth; c++) {
        let sequence = 0;
        for (let r = 0; r < boardHeight; r++) {
            if (board[r][c] && r > 0 && board[r][c] === board[r - 1][c]) {
                sequence++;
            } else {
                if (sequence >= 2) { // Found a match of 3 or more ending at r-1
                     for (let i = 0; i <= sequence; i++) {
                        matches.push({ row: r - 1 - i, col: c });
                    }
                }
                sequence = 0; // Reset sequence
            }
        }
        // Check if sequence ends at the edge of the board
        if (sequence >= 2) {
             for (let i = 0; i <= sequence; i++) {
                matches.push({ row: boardHeight - 1 - i, col: c });
            }
        }
    }

    // Remove duplicate match positions
    const uniqueMatches = Array.from(new Set(matches.map(m => `${m.row}-${m.col}`))).map(s => {
        const parts = s.split('-');
        return { row: parseInt(parts[0]), col: parseInt(parts[1]) };
    });

    return uniqueMatches;
}

function removeMatches(matches) {
    const baseScorePerCandy = 10; // Base score for each removed candy
    const bonusScorePerMatch = 50; // Bonus for each match found

    // Add score based on the number of unique candies removed
    score += matches.length * baseScorePerCandy;
     // Add a bonus based on the number of matches found (can be complex, simple here)
    if (matches.length > 0) {
         // A simple way to count "matches" is by the number of unique cells removed
         // Or you can refine findMatches to return sets of matches (e.g., [[match1],[match2]])
         // For simplicity, let's just give a bonus if *any* match was found
         score += bonusScorePerMatch;
    }

    updateScoreDisplay();

    matches.forEach(pos => {
        board[pos.row][pos.col] = null; // Mark as empty in the array
        const element = getCandyElementByPosition(pos.row, pos.col);
        if (element) {
            element.classList.add('removing'); // Add class for fade-out animation
            // Element will be removed from DOM in updateBoardDOM after cascade/fill
        }
    });
}


function cascadeCandies() {
    for (let c = 0; c < boardWidth; c++) {
        let emptySpaces = 0;
        // Iterate from bottom up
        for (let r = boardHeight - 1; r >= 0; r--) {
            if (board[r][c] === null) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                // Move candy down
                board[r + emptySpaces][c] = board[r][c];
                board[r][c] = null; // Set original position to empty
                 // Note: Visual movement (transform/animation) is more complex.
                 // For this basic version, we'll just update the DOM's content later.
            }
        }
    }
}

function fillBoard() {
    for (let c = 0; c < boardWidth; c++) {
        for (let r = 0; r < boardHeight; r++) {
            if (board[r][c] === null) {
                // Fill empty spot with a new random candy
                board[r][c] = candies[Math.floor(Math.random() * candies.length)];
                 // Note: Visual creation animation is more complex.
                 // For this basic version, we'll just update the DOM's content later.
            }
        }
    }
}

// Helper function to get a candy element from the DOM by its data attributes
function getCandyElementByPosition(row, col) {
    return gameBoard.querySelector(`.candy[data-row="${row}"][data-col="${col}"]`);
}

// Update the visual board in the DOM to match the board array state
function updateBoardDOM() {
     // Remove all existing candy elements that were marked for removal
     const elementsToRemove = gameBoard.querySelectorAll('.candy.removing');
     elementsToRemove.forEach(el => el.remove());

     // Iterate through the board array and update/create elements
    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) {
            const currentCandy = board[r][c];
            let element = getCandyElementByPosition(r, c);

            if (currentCandy !== null) {
                // If there should be a candy here...
                if (element) {
                    // ...and an element exists, update its content
                    element.textContent = currentCandy;
                     // Ensure it doesn't have removing class
                     element.classList.remove('removing'); // Should already be removed, but good practice
                     element.style.opacity = 1; // Ensure visibility

                } else {
                    // ...and no element exists (e.g., just filled), create a new one
                    // This is less efficient than trying to reuse/move elements
                    // In a real game, you'd move existing elements or create new ones intelligently
                    // For simplicity here, we'll just log an issue or rely on a full redraw (less ideal)
                    console.error(`DOM element missing at ${r},${c}. Board state:`, currentCandy);
                    // A more robust approach would involve managing DOM elements more carefully during cascade.
                    // For this basic example, we might just accept some visual glitches or
                    // consider a full board redraw (though that loses swap/cascade animations).

                    // To make this simple version work, we'll just create a new element if missing.
                    // This won't animate falling-in correctly, but it will show the board state.
                    const newElement = createCandyElement(currentCandy, r, c);
                    // Find the correct insertion point to maintain grid order
                    // This is tricky with a simple appendChild. A full re-creation or better DOM management is needed.
                    // For now, let's just rely on the grid layout to position it if added somewhere.
                     // This part needs refinement for smooth animations.
                     // A better approach: keep a map of {row-col -> element} and update that map.
                     // Or, re-create the grid completely (simplest but least performant/animated).

                     // Let's try re-creating for simplicity in this example code, losing smooth cascade animation for new elements
                     // A better method involves CSS transforms and managing element positions.
                     // For now, the removing animation and swap animation work. New candies just appear.
                }
            }
            // If currentCandy is null, the removing element should have been handled or there's no element needed.
        }
    }
     // A full DOM update after cascade/fill might look like this (replaces the above loop):
     gameBoard.innerHTML = ''; // Clear the board
      for (let r = 0; r < boardHeight; r++) {
         for (let c = 0; c < boardWidth; c++) {
             const candyType = board[r][c];
             if (candyType !== null) {
                  const candyElement = createCandyElement(candyType, r, c);
                  gameBoard.appendChild(candyElement);
             } else {
                 // Add an empty placeholder div if needed for grid structure, or let grid handle it
                 // gameBoard.appendChild(document.createElement('div')); // Might mess up grid depending on CSS
             }
         }
     }
     // NOTE: The full redraw above *breaks* existing animations and element references.
     // The initial partial update loop is better *if* you can manage element creation/removal correctly.
     // Let's stick to the partial update but acknowledge its limitations without proper element management.

     // Let's try a simpler DOM update strategy: Re-query all candies and update based on the board array
     // This works better after cascade/fill where positions change logically
     const allCandyElements = gameBoard.querySelectorAll('.candy:not(.removing)');
     const elementMap = {};
     allCandyElements.forEach(el => {
         elementMap[`${el.dataset.row}-${el.dataset.col}`] = el;
     });

     gameBoard.innerHTML = ''; // Clear the DOM board entirely

      for (let r = 0; r < boardHeight; r++) {
         for (let c = 0; c < boardWidth; c++) {
             const candyType = board[r][c];
             if (candyType !== null) {
                  // Try to find the old element (which now has the correct logical position in its dataset)
                  let candyElement = elementMap[`${r}-${c}`];
                  if (!candyElement) {
                      // If not found, it's a new candy
                      candyElement = createCandyElement(candyType, r, c);
                      // New candies don't need the removing class
                       candyElement.classList.remove('removing');
                       candyElement.style.opacity = 1;
                  } else {
                      // Found the old element, update its visual state if needed
                      candyElement.textContent = candyType; // Ensure text is correct
                       candyElement.classList.remove('removing');
                       candyElement.style.opacity = 1;
                  }
                   // Append the element (new or old) to the board in order
                   gameBoard.appendChild(candyElement);
             } else {
                 // If the board cell is null, ensure no element is appended for that spot
             }
         }
     }
     // This re-creation method is the simplest way to synchronize DOM with the board array after complex moves.
     // It loses smooth cascade/fill animations but makes the logic robust for this example.
     // Smooth animations require managing CSS transforms or absolute positioning during cascade.
}


function showMessage(text, duration = 1500) {
    messageArea.textContent = text;
    messageArea.style.opacity = 1;
    setTimeout(() => {
        messageArea.style.opacity = 0;
    }, duration);
}

function checkGameEnd() {
    // Example: Check if moves run out
    if (moves <= 0) {
        // In a real game, you'd check for possible moves remaining, not just move count
        // If no moves possible OR moves run out in a moves-limited level
        showMessage("Game Over!", 3000);
        startButton.textContent = "Play Again?";
        startButton.style.display = 'block'; // Show restart button
        // Disable further clicks? Or handle restart
    }
    // Add checks for level goals (e.g., target score, collect certain candies)
    // If level goal met:
    // showMessage("Level Complete!", 3000);
    // Unlock next level
    // Maybe show a Level Success screen
}


// --- Event Listeners ---
startButton.addEventListener('click', initGame);


// --- Initial Setup ---
// You might want to show a home screen first, then call initGame on button click
// For this example, let's show the start button initially.
// initGame(); // Don't auto-start, wait for button click
