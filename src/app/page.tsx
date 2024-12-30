"use client";

import React, { useState } from "react";
import { shuffle } from "lodash-es";

/**
 * A single Ticket is a 3×9 matrix of numbers (or 0 if empty).
 * Each ticket must have exactly 15 numbers placed such that:
 *  - Each row has 5 numbers
 *  - Each column has at least 1 number
 */
type TicketMatrix = number[][];

/** Returns the array [1..90]. */
function allNumbers(): number[] {
  return Array.from({ length: 90 }, (_, i) => i + 1);
}

/**
 * Buckets:
 * - sets[0] => [1..9]
 * - sets[1] => [10..19]
 * - ...
 * - sets[8] => [80..90]  (11 numbers)
 */
function getSets(): number[][] {
  const all = allNumbers();
  const sets: number[][] = [];
  for (let i = 0; i < 9; i++) {
    if (i === 0) {
      // first bucket => 9 numbers
      sets.push(all.splice(0, 9));
    } else if (i === 8) {
      // last bucket => leftover (should be 11)
      sets.push(all);
    } else {
      // middle => 10 numbers each
      sets.push(all.splice(0, 10));
    }
  }
  return sets;
}

/** Create a new empty 3×9 ticket. */
function getNewTicket(): TicketMatrix {
  return Array.from({ length: 3 }, () => Array(9).fill(0));
}

/** Count how many numbers (non-zero) are in the ticket. */
function getTicketNumbersCount(ticket: TicketMatrix): number {
  return ticket.flat().filter((val) => val !== 0).length;
}

/** Check if a ticket already has a given number. */
function ifTicketHasNumber(ticket: TicketMatrix, num: number): boolean {
  return ticket.flat().includes(num);
}

/**
 * Row selection for the next number:
 *  - If total count < 5 => row0
 *  - If total count <10 => row1
 *  - else => row2
 */
function getAvailableRowIndex(ticket: TicketMatrix): number {
  const count = getTicketNumbersCount(ticket);
  if (count < 5) return 0;
  if (count < 10) return 1;
  return 2;
}

/** Which column does `num` belong to? */
function getBelongingColumnIndex(num: number, sets: number[][]): number {
  return sets.findIndex((set) => set.includes(num));
}

/** Can we place a number in ticket[row][col] if it's 0? */
function canPlaceNumber(
  ticket: TicketMatrix,
  row: number,
  col: number
): boolean {
  return ticket[row][col] === 0;
}

/** Place the number in the given cell. */
function placeNumber(
  ticket: TicketMatrix,
  num: number,
  row: number,
  col: number
) {
  ticket[row][col] = num;
}

/** Validate the standard Tambola constraints on a ticket. */
function validateTicket(ticket: TicketMatrix): boolean {
  // Must have 15 total
  if (getTicketNumbersCount(ticket) !== 15) return false;

  // Each row => exactly 5
  for (let r = 0; r < 3; r++) {
    const rowCount = ticket[r].filter((val) => val !== 0).length;
    if (rowCount !== 5) return false;
  }

  // Each column => at least 1
  for (let c = 0; c < 9; c++) {
    let colCount = 0;
    for (let r = 0; r < 3; r++) {
      if (ticket[r][c] !== 0) colCount++;
    }
    if (colCount === 0) return false;
  }

  return true;
}

/**
 * Return a random number from [1..90] that's not in pickedNumbers,
 * or undefined if all are used.
 */
function pickRandom(pickedNumbers: number[]): number | undefined {
  const pool = allNumbers().filter((num) => !pickedNumbers.includes(num));
  if (pool.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * After we have placed numbers in the 3×9 grid, each column might have
 * up to 3 values (since at most 3 rows). Typically, we might just “sort” them
 * top-to-bottom. But now we want them to appear in random rows, but still
 * in ascending order top → bottom.
 *
 * Example:
 *  - If a column has 1 number [22], it can appear randomly in row0, row1, or row2.
 *  - If a column has 2 numbers [22, 45], we pick a random pair among ( (0,1),(0,2),(1,2) )
 *    and place 22 in the top row of that pair, 45 in the bottom row of that pair.
 *  - If a column has 3 numbers, there's no choice: row0 < row1 < row2 in ascending order.
 */
function randomizeColumnRows(ticket: TicketMatrix): TicketMatrix {
  // We'll build a new 3×9 matrix with 0s, then fill columns randomly.
  const newMatrix = getNewTicket();

  for (let c = 0; c < 9; c++) {
    // gather the non-zero values from the old ticket
    const colValues = [ticket[0][c], ticket[1][c], ticket[2][c]].filter(
      (v) => v !== 0
    );

    // sort ascending to preserve order
    colValues.sort((a, b) => a - b);

    // place them in random row positions, preserving ascending top→bottom
    const k = colValues.length;
    if (k === 1) {
      // any row 0..2
      const possibleRows = [0, 1, 2];
      const chosenRow =
        possibleRows[Math.floor(Math.random() * possibleRows.length)];
      newMatrix[chosenRow][c] = colValues[0];
    } else if (k === 2) {
      // choose among pairs: (0,1), (0,2), (1,2)
      const rowPairs: [number, number][] = [
        [0, 1],
        [0, 2],
        [1, 2],
      ];
      const chosen = rowPairs[Math.floor(Math.random() * rowPairs.length)];
      // smaller in chosen[0], bigger in chosen[1]
      newMatrix[chosen[0]][c] = colValues[0];
      newMatrix[chosen[1]][c] = colValues[1];
    } else if (k === 3) {
      // no choice, must fill (0,1,2)
      newMatrix[0][c] = colValues[0];
      newMatrix[1][c] = colValues[1];
      newMatrix[2][c] = colValues[2];
    }
    // if k=0, do nothing (all zero in that column)
  }

  return newMatrix;
}

/**
 * Generate a single ticket by repeated random picks, ensuring:
 *  - 15 numbers total
 *  - no overlap with already pickedNumbers
 */
function genRandomizedTicket(
  pickedNumbers: number[],
  sets: number[][]
): TicketMatrix {
  const MAX_TRIES = 20;
  let trials = 0;

  function attempt(): TicketMatrix {
    if (trials >= MAX_TRIES) {
      throw new Error("Too many attempts to create ticket. Giving up.");
    }
    trials++;

    const ticket = getNewTicket();

    while (getTicketNumbersCount(ticket) < 15) {
      const randomNum = pickRandom(pickedNumbers);
      if (!randomNum) {
        throw new Error("No more numbers available!");
      }
      if (!ifTicketHasNumber(ticket, randomNum)) {
        const rowIndex = getAvailableRowIndex(ticket);
        const colIndex = getBelongingColumnIndex(randomNum, sets);

        if (canPlaceNumber(ticket, rowIndex, colIndex)) {
          placeNumber(ticket, randomNum, rowIndex, colIndex);
          pickedNumbers.push(randomNum);
        }
      }
    }

    if (!validateTicket(ticket)) {
      // remove those just added
      const used = ticket.flat().filter((x) => x !== 0);
      for (const num of used) {
        const idx = pickedNumbers.indexOf(num);
        if (idx >= 0) pickedNumbers.splice(idx, 1);
      }
      return attempt();
    }
    return ticket;
  }

  return attempt();
}

/**
 * The "short-circuit" approach for the final ticket,
 * using leftover numbers directly.
 */
function getNewTicketFromList(
  numbers: number[],
  sets: number[][]
): TicketMatrix {
  const ticket = getNewTicket();
  shuffle(numbers);

  for (const num of numbers) {
    for (let r = 0; r < 3; r++) {
      if (ticket[r].filter((val) => val !== 0).length >= 5) {
        continue;
      }
      const colIndex = getBelongingColumnIndex(num, sets);
      if (canPlaceNumber(ticket, r, colIndex)) {
        placeNumber(ticket, num, r, colIndex);
        break;
      }
    }
  }
  return ticket;
}

/**
 * Generate N tickets, each with 15 distinct numbers (no overlap across tickets).
 * After each ticket is created, we randomize the column positions.
 */
function generateTickets(n: number): TicketMatrix[] {
  const sets = getSets();
  const pickedNumbers: number[] = [];
  const allNums = allNumbers();

  const results: TicketMatrix[] = [];

  for (let i = 0; i < n; i++) {
    let baseTicket: TicketMatrix;
    if (i === n - 1) {
      // last ticket => short-circuit
      const leftover = allNums.filter((x) => !pickedNumbers.includes(x));
      const lastTicket = getNewTicketFromList(leftover, sets);
      if (!validateTicket(lastTicket)) {
        // fallback to normal approach
        baseTicket = genRandomizedTicket(pickedNumbers, sets);
      } else {
        // Mark used
        for (const num of lastTicket.flat()) {
          if (num !== 0) {
            pickedNumbers.push(num);
          }
        }
        baseTicket = lastTicket;
      }
    } else {
      baseTicket = genRandomizedTicket(pickedNumbers, sets);
    }

    // Now shuffle the row positions within each column (ascending, but random row placement)
    const randomized = randomizeColumnRows(baseTicket);

    results.push(randomized);
  }

  return results;
}

//
// REACT COMPONENT
//

interface CardState {
  ticket: TicketMatrix;
  markedNumbers: Set<number>;
}

const TicketPage: React.FC = () => {
  const [count, setCount] = useState(1);
  const [cards, setCards] = useState<CardState[]>([]);

  const handleGenerate = () => {
    try {
      const generated = generateTickets(count);
      const newCards = generated.map((ticket) => ({
        ticket,
        markedNumbers: new Set<number>(),
      }));
      setCards(newCards);
    } catch (e) {
      console.error(e);
      alert(`Error generating tickets: ${(e as Error).message}`);
      setCards([]);
    }
  };

  // Toggle marked/unmarked on a cell
  const handleMarkNumber = (cardIndex: number, num: number) => {
    setCards((prev) => {
      const newCards = [...prev];
      const { markedNumbers } = newCards[cardIndex];
      const clone = new Set(markedNumbers);
      if (clone.has(num)) clone.delete(num);
      else clone.add(num);

      newCards[cardIndex] = {
        ...newCards[cardIndex],
        markedNumbers: clone,
      };
      return newCards;
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Ticket Page</h1>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center mb-6">
        <label htmlFor="count" className="font-semibold">
          Number of Tickets:
        </label>
        <select
          id="count"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          className="bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Generate
        </button>
      </div>

      <div className="flex flex-wrap gap-8 justify-center">
        {cards.map(({ ticket, markedNumbers }, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-300 shadow-md rounded-md p-4 w-full sm:w-auto"
          >
            <h2 className="text-lg font-bold text-center mb-4">
              Ticket #{idx + 1}
            </h2>
            <div className="overflow-x-auto w-full">
              <table className="table-auto border-collapse mx-auto">
                <tbody>
                  {ticket.map((row, rowIndex) => (
                    <tr key={rowIndex} className="text-center">
                      {row.map((cellValue, colIndex) => {
                        if (cellValue === 0) {
                          return (
                            <td key={colIndex} className="px-1 py-1 sm:px-2">
                              <span className="inline-block w-8 h-8 sm:w-12 sm:h-12" />
                            </td>
                          );
                        } else {
                          const isMarked = markedNumbers.has(cellValue);
                          return (
                            <td key={colIndex} className="px-1 py-1 sm:px-2">
                              <button
                                onClick={() => handleMarkNumber(idx, cellValue)}
                                className={`relative rounded-md border border-gray-300
                                            w-8 h-8 sm:w-12 sm:h-12 text-sm sm:text-lg font-bold
                                            text-black
                                            ${
                                              isMarked
                                                ? "bg-orange-200"
                                                : "bg-gray-100 hover:bg-blue-100"
                                            }`}
                              >
                                {cellValue}
                                {isMarked && (
                                  <span className="absolute inset-0 flex items-center justify-center text-red-600 text-lg sm:text-2xl pointer-events-none">
                                    X
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        }
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Crossed-off numbers display */}
            <div className="mt-3 text-center">
              <h3 className="text-sm font-semibold">Crossed Off</h3>
              {markedNumbers.size > 0 ? (
                <p className="text-sm text-black mt-1">
                  {Array.from(markedNumbers)
                    .sort((a, b) => a - b)
                    .join(", ")}
                </p>
              ) : (
                <p className="text-xs text-black mt-1">
                  No numbers crossed off yet
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketPage;
