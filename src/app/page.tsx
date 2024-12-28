"use client";

import React, { useState } from "react";

/**
 * A helper to get a random integer in [min, max].
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * A Tambola card is represented as:
 * - An array of 9 columns,
 * - Each column is an array of 3 items (numbers or null if empty).
 */
type TambolaCard = Array<Array<number | null>>;

/**
 * Generate a single Tambola card with:
 * - 3 rows
 * - 9 columns
 * - exactly 15 filled cells (5 per row)
 * - no column is empty (at least 1 filled cell)
 * - no duplicate numbers across the card
 * - column 0 => [1..9], column 1 => [10..19], ..., column 8 => [80..89]
 * - each column is sorted in ascending order from top to bottom
 */
function generateTambolaCard(): TambolaCard {
  // Step 1: Determine which (row, col) cells will be filled
  //         We want exactly 15 cells filled (5 in each row), and each column must have at least 1 filled cell.

  // Initialize empty card
  const card: TambolaCard = Array.from({ length: 9 }, () => Array(3).fill(null));

  // rowCap[r] will track how many columns row r has used
  const rowCap = [0, 0, 0];

  // We'll store chosen (row, col) pairs in chosenCells
  const chosenCells = new Set<string>();

  // First pass: ensure each column has at least one row
  for (let col = 0; col < 9; col++) {
    const possibleRows = [0, 1, 2].filter((r) => rowCap[r] < 5);
    // In the rare case all rows are full (shouldn't normally happen here), just pick any
    const row =
      possibleRows.length > 0
        ? possibleRows[Math.floor(Math.random() * possibleRows.length)]
        : Math.floor(Math.random() * 3);

    chosenCells.add(`${row},${col}`);
    rowCap[row]++;
  }

  // Second pass: continue adding columns to rows until each row has 5 columns
  while (rowCap.some((count) => count < 5)) {
    // Find a row that is not yet at capacity (less than 5)
    const rowCandidates = [0, 1, 2].filter((r) => rowCap[r] < 5);
    if (rowCandidates.length === 0) break; // in case of a weird edge case

    const row = rowCandidates[Math.floor(Math.random() * rowCandidates.length)];

    // Find a column that is not yet chosen in this row
    const colCandidates = [];
    for (let c = 0; c < 9; c++) {
      if (!chosenCells.has(`${row},${c}`)) {
        colCandidates.push(c);
      }
    }
    if (colCandidates.length === 0) break;

    const col = colCandidates[Math.floor(Math.random() * colCandidates.length)];
    chosenCells.add(`${row},${col}`);
    rowCap[row]++;
  }

  // Step 2: We now know exactly which cells are chosen for each column and row.
  //         We'll assign random numbers in each column's range, without duplicates across the card,
  //         and ensure ascending order for each column.

  const usedNumbers = new Set<number>(); // track duplicates across entire card

  for (let col = 0; col < 9; col++) {
    // Find which rows in this column are chosen
    const chosenRowsForCol = [];
    for (let row = 0; row < 3; row++) {
      if (chosenCells.has(`${row},${col}`)) {
        chosenRowsForCol.push(row);
      }
    }

    // Determine the numeric range for this column
    const start = col * 10 + 1; // e.g., col=0 => 1..9, col=1 => 10..19, ...
    const end = start + 8; // note: 1..9 is 9 numbers, 10..19 is 10 numbers, so for col 0 we handle 1..9

    // We need exactly chosenRowsForCol.length distinct random numbers from [start..end]
    const neededCount = chosenRowsForCol.length;
    const colNumbers: number[] = [];

    while (colNumbers.length < neededCount) {
      const num = randInt(start, end);
      if (!usedNumbers.has(num)) {
        usedNumbers.add(num);
        colNumbers.push(num);
      }
    }

    // Sort colNumbers ascending
    colNumbers.sort((a, b) => a - b);

    // Also sort the chosen rows, so we place smaller numbers in top rows
    chosenRowsForCol.sort((a, b) => a - b);

    // Assign them in ascending row order
    chosenRowsForCol.forEach((row, idx) => {
      card[col][row] = colNumbers[idx];
    });
  }

  return card;
}

// ----- Main Component -----

interface CardState {
  card: TambolaCard;
  markedNumbers: Set<number>;
}

const TambolaCards: React.FC = () => {
  const [numCards, setNumCards] = useState<number>(1);
  const [cards, setCards] = useState<CardState[]>([]);

  /**
   * Generate the given number of cards.
   */
  const handleGenerateCards = () => {
    // Create an array of { card, markedNumbers }
    const generated = Array.from({ length: numCards }, () => ({
      card: generateTambolaCard(),
      markedNumbers: new Set<number>(),
    }));
    setCards(generated);
  };

  /**
   * Toggle the 'marked' state of a number for a specific card index.
   */
  const handleNumberClick = (cardIndex: number, number: number) => {
    setCards((prevCards) => {
      const newCards = [...prevCards];
      const currentMarked = new Set(newCards[cardIndex].markedNumbers);

      if (currentMarked.has(number)) {
        currentMarked.delete(number);
      } else {
        currentMarked.add(number);
      }

      newCards[cardIndex] = {
        ...newCards[cardIndex],
        markedNumbers: currentMarked,
      };

      return newCards;
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Tambola Cards</h1>

      {/* Controls to choose how many cards to generate */}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center mb-6">
        <label htmlFor="numCards" className="font-semibold">
          Number of Cards:
        </label>
        <select
          id="numCards"
          value={numCards}
          onChange={(e) => setNumCards(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerateCards}
          className="bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Generate
        </button>
      </div>

      {/* Display the cards */}
      <div className="flex flex-wrap justify-center gap-8">
        {cards.map(({ card, markedNumbers }, cardIndex) => (
          <div
            key={cardIndex}
            className="bg-white border border-gray-300 shadow-md rounded-md p-4 w-full sm:w-auto"
          >
            <h2 className="text-lg font-bold text-center mb-4">
              Card #{cardIndex + 1}
            </h2>
            <table className="table-auto border-collapse mx-auto">
              <tbody>
                {/* Each card has 3 rows */}
                {Array.from({ length: 3 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="text-center">
                    {/* 9 columns per row */}
                    {card.map((colArray, colIndex) => {
                      const cellValue = colArray[rowIndex];
                      return (
                        <td key={colIndex} className="px-2 py-2">
                          {cellValue && (
                            <button
                              onClick={() =>
                                handleNumberClick(cardIndex, cellValue)
                              }
                              className={`relative w-12 h-12 flex items-center justify-center
                                          border border-gray-300 rounded-md
                                          text-lg font-bold text-gray-700
                                          transition-colors 
                                          ${
                                            markedNumbers.has(cellValue)
                                              ? "bg-orange-200"
                                              : "bg-gray-100 hover:bg-blue-100"
                                          }
                                        `}
                            >
                              {/* The number itself */}
                              <span>{cellValue}</span>

                              {/* If marked, overlay a smaller red 'X' */}
                              {markedNumbers.has(cellValue) && (
                                <span
                                  className="absolute text-red-600 text-2xl pointer-events-none"
                                  style={{ lineHeight: "1" }}
                                >
                                  X
                                </span>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TambolaCards;
