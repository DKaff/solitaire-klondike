import React, { useState, useEffect } from "react";

const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function generateDeck() {
  const deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function isNextFoundationCard(card, foundationPile) {
  const expectedRankIndex = foundationPile.length;
  return ranks.indexOf(card.rank) === expectedRankIndex;
}

function App() {
  const [tableau, setTableau] = useState([]);
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [foundations, setFoundations] = useState({
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  });
  const [selection, setSelection] = useState(null);
  const [hasWon, setHasWon] = useState(false);
  const [undoState, setUndoState] = useState(null);

  useEffect(() => {
    const deck = generateDeck();
    const newTableau = [];
    for (let i = 0; i < 7; i++) {
      const pile = deck.splice(0, i + 1);
      pile[pile.length - 1].faceUp = true;
      newTableau.push(pile);
    }
    setTableau(newTableau);
    setStock(deck);
  }, []);

  useEffect(() => {
    const won = Object.values(foundations).every(pile => pile.length === 13);
    setHasWon(won);
  }, [foundations]);

  function saveUndoState() {
    setUndoState({
      tableau: JSON.parse(JSON.stringify(tableau)),
      stock: JSON.parse(JSON.stringify(stock)),
      waste: JSON.parse(JSON.stringify(waste)),
      foundations: JSON.parse(JSON.stringify(foundations)),
    });
  }

  function handleUndo() {
    if (undoState) {
      setTableau(undoState.tableau);
      setStock(undoState.stock);
      setWaste(undoState.waste);
      setFoundations(undoState.foundations);
      setUndoState(null);
    }
  }

  function onStockClick() {
    saveUndoState();
    if (stock.length === 0) {
      setStock(waste.map(card => ({ ...card, faceUp: false })).reverse());
      setWaste([]);
    } else {
      const card = stock[stock.length - 1];
      setStock(stock.slice(0, -1));
      setWaste([...waste, { ...card, faceUp: true }]);
    }
    setSelection(null);
  }

  function canPlaceOnTableau(card, targetCard) {
    const isRed = card.suit === "hearts" || card.suit === "diamonds";
    const isTargetRed = targetCard && (targetCard.suit === "hearts" || targetCard.suit === "diamonds");
    const rankOrder = ranks.indexOf(card.rank);
    const targetRank = targetCard ? ranks.indexOf(targetCard.rank) : -1;
    return (
      (!targetCard && card.rank === "K") ||
      (targetCard && isRed !== isTargetRed && rankOrder === targetRank - 1)
    );
  }

  function handleTableauDrop(sourcePileIdx, sourceCardIdx, targetPileIdx) {
    if (sourcePileIdx === targetPileIdx) return;

    const sourcePile = tableau[sourcePileIdx];
    const targetPile = tableau[targetPileIdx];
    const movingCards = sourcePile.slice(sourceCardIdx);
    const targetTopCard = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;

    if (canPlaceOnTableau(movingCards[0], targetTopCard)) {
      saveUndoState();
      const newSourcePile = sourcePile.slice(0, sourceCardIdx);
      if (newSourcePile.length > 0) {
        const topCard = newSourcePile[newSourcePile.length - 1];
        if (!topCard.faceUp) newSourcePile[newSourcePile.length - 1] = { ...topCard, faceUp: true };
      }
      const newTargetPile = [...targetPile, ...movingCards];

      const newTableau = tableau.slice();
      newTableau[sourcePileIdx] = newSourcePile;
      newTableau[targetPileIdx] = newTargetPile;
      setTableau(newTableau);
    }
  }

  function handleWasteDrop(targetPileIdx) {
    if (waste.length === 0) return;
    const card = waste[waste.length - 1];
    const targetPile = tableau[targetPileIdx];
    const targetTopCard = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;

    if (canPlaceOnTableau(card, targetTopCard)) {
      saveUndoState();
      const newTargetPile = [...targetPile, card];
      const newWaste = waste.slice(0, -1);

      setTableau(tableau.map((p, i) => i === targetPileIdx ? newTargetPile : p));
      setWaste(newWaste);
    }
  }

  function handleFoundationDrop(suit) {
    if (selection?.type === "waste" && waste.length > 0) {
      const card = waste[waste.length - 1];
      if (card.suit === suit && isNextFoundationCard(card, foundations[suit])) {
        saveUndoState();
        setFoundations({ ...foundations, [suit]: [...foundations[suit], card] });
        setWaste(waste.slice(0, -1));
      }
    } else if (selection?.type === "tableau") {
      const { pileIdx, cardIdx } = selection;
      const sourcePile = tableau[pileIdx];
      const card = sourcePile[cardIdx];

      if (card.suit === suit && cardIdx === sourcePile.length - 1 && isNextFoundationCard(card, foundations[suit])) {
        saveUndoState();
        const newFoundations = { ...foundations, [suit]: [...foundations[suit], card] };
        const newPile = sourcePile.slice(0, cardIdx);
        if (newPile.length > 0 && !newPile[newPile.length - 1].faceUp) {
          newPile[newPile.length - 1] = { ...newPile[newPile.length - 1], faceUp: true };
        }
        const newTableau = tableau.map((p, i) => i === pileIdx ? newPile : p);
        setFoundations(newFoundations);
        setTableau(newTableau);
      }
    }
  }

  // New: handle drag from foundation to tableau
  function handleFoundationToTableauDrop(suit, targetPileIdx) {
    const foundationPile = foundations[suit];
    if (foundationPile.length === 0) return;

    const card = foundationPile[foundationPile.length - 1];
    const targetPile = tableau[targetPileIdx];
    const targetTopCard = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;

    if (canPlaceOnTableau(card, targetTopCard)) {
      saveUndoState();

      // Remove card from foundation
      const newFoundationPile = foundationPile.slice(0, foundationPile.length - 1);
      setFoundations({ ...foundations, [suit]: newFoundationPile });

      // Add card to tableau pile
      const newTargetPile = [...targetPile, { ...card, faceUp: true }];
      setTableau(tableau.map((p, i) => (i === targetPileIdx ? newTargetPile : p)));
    }
  }

  const getCardColor = (suit) => (suit === "hearts" || suit === "diamonds") ? "red" : "black";

  return (
    <div style={{ padding: 20 }}>
      {hasWon && <h2>You Win!</h2>}

      <button onClick={handleUndo} disabled={!undoState}>Undo</button>

      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div
          onClick={onStockClick}
          style={{ width: 60, height: 90, backgroundColor: stock.length ? "gray" : "lightgray", border: "1px solid black" }}
        />

        <div
          draggable={waste.length > 0}
          onDragStart={e => {
            const card = waste[waste.length - 1];
            e.dataTransfer.setData("text/plain", JSON.stringify({ type: "waste" }));
            setSelection({ type: "waste", card });
          }}
          style={{
            width: 60,
            height: 90,
            backgroundColor: "white",
            border: "1px solid black",
            textAlign: "center",
            lineHeight: "90px",
            color: waste.length > 0 ? getCardColor(waste[waste.length - 1].suit) : "black",
            fontWeight: "bold"
          }}
        >
          {waste.length > 0 ? `${waste[waste.length - 1].rank} ${waste[waste.length - 1].suit[0].toUpperCase()}` : ""}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {Object.keys(foundations).map((suit, idx) => {
            const foundationPile = foundations[suit];
            const topCard = foundationPile.length > 0 ? foundationPile[foundationPile.length - 1] : null;

            return (
              <div
                key={idx}
                onDrop={e => {
                  e.preventDefault();
                  handleFoundationDrop(suit);
                  setSelection(null);
                }}
                onDragOver={e => e.preventDefault()}
                style={{
                  width: 60,
                  height: 90,
                  border: "1px solid black",
                  backgroundColor: "lightyellow",
                  textAlign: "center",
                  lineHeight: "90px",
                  color: foundationPile.length > 0 ? getCardColor(topCard.suit) : "black",
                  fontWeight: "bold",
                  position: "relative",
                }}
              >
                {topCard ? (
                  <div
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData("text/plain", JSON.stringify({ type: "foundation", suit }));
                      setSelection({ type: "foundation", suit });
                    }}
                    style={{
                      width: 60,
                      height: 90,
                      cursor: "pointer",
                      color: getCardColor(topCard.suit),
                      userSelect: "none",
                      fontWeight: "bold",
                      lineHeight: "90px",
                    }}
                  >
                    {`${topCard.rank} ${suit[0].toUpperCase()}`}
                  </div>
                ) : (
                  suit[0].toUpperCase()
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {tableau.map((pile, pileIdx) => (
          <div
            key={pileIdx}
            onDrop={e => {
              e.preventDefault();
              const data = JSON.parse(e.dataTransfer.getData("text/plain"));
              if (data.type === "tableau") {
                handleTableauDrop(data.pileIdx, data.cardIdx, pileIdx);
              } else if (data.type === "waste") {
                handleWasteDrop(pileIdx);
              } else if (data.type === "foundation") {
                handleFoundationToTableauDrop(data.suit, pileIdx);
              }
              setSelection(null);
            }}
            onDragOver={e => e.preventDefault()}
            style={{ position: "relative", width: 60, minHeight: 400 }}
          >
            {pile.map((card, idx) => (
              <div
                key={idx}
                draggable={card.faceUp}
                onDragStart={e => {
                  e.dataTransfer.setData("text/plain", JSON.stringify({ pileIdx, cardIdx: idx, type: "tableau" }));
                  setSelection({ type: "tableau", pileIdx, cardIdx: idx });
                }}
                style={{
                  position: "absolute",
                  top: idx * 40,
                  left: 0,
                  width: 60,
                  height: 90,
                  borderRadius: 5,
                  backgroundColor: card.faceUp ? "white" : "#336",
                  border: selection && selection.pileIdx === pileIdx && selection.cardIdx === idx ? "2px solid blue" : "1px solid black",
                  color: card.faceUp ? getCardColor(card.suit) : "white",
                  textAlign: "center",
                  lineHeight: "90px",
                  fontWeight: "bold",
                  userSelect: "none",
                  boxShadow: card.faceUp ? "2px 2px 5px rgba(0,0,0,0.3)" : "none",
                  cursor: card.faceUp ? "pointer" : "default",
                  backgroundImage: card.faceUp ? "none" : "repeating-linear-gradient(45deg, #336 0, #336 10px, #447 10px, #447 20px)",
                }}
              >
                {card.faceUp ? `${card.rank} ${card.suit[0].toUpperCase()}` : "🂠"}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
