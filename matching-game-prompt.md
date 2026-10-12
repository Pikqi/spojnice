# Build a Matching-Game Web App

Build a simple web app for learning by matching related items in two columns. The initial use case is studying for a ham radio exam, but users should be able to create games for any subject.

## Creating a game

Users upload a JSON file containing a title, optional description, column labels, and pairs of text. For example:

```json
{
  "title": "Ham Radio Country Prefixes",
  "description": "Match countries to their callsign prefixes.",
  "leftColumnLabel": "Country",
  "rightColumnLabel": "Prefix",
  "pairs": [
    { "left": "England", "right": "G" },
    { "left": "Serbia", "right": "YU" },
    { "left": "Germany", "right": "DL" },
    { "left": "France", "right": "F" }
  ]
}
```

- Provide an example file users can download.
- Validate the upload and show clear errors for invalid JSON, missing fields, empty answers, or duplicate labels within either column.
- Require at least two pairs.
- Let users preview the game before creating it.
- When creating it, users choose **public** or **private**, with private selected by default.

## Sharing and discovery

- Every created game gets a unique, unguessable link that opens it directly.
- **Public games** appear in a searchable directory and can also be shared by link.
- **Private games** do not appear in the directory. Anyone with their link can play, so explain that private means unlisted.
- After creation, show the game link with a copy button.
- Games are saved permanently and cannot be edited or deleted through the app.
- Do not implement accounts, sign-in, ownership, or management links.

## Gameplay

Before playing, users choose the number of pairs per round: 4, 6, 8, or 10, capped at the number of pairs available.

- Shuffle the dataset and divide it into rounds so every pair appears once per session.
- Show two columns and shuffle each column independently.
- Players can select an item from either column first, then choose its match from the opposite column.
- Highlight the selected item. Selecting another item in the same column changes the selection; selecting it again deselects it.
- A correct match gives immediate positive feedback and marks both items as completed and no longer selectable.
- An incorrect match gives immediate negative feedback, then clears the selection so the player can try again.
- Use text or icons as well as color for feedback.
- A round ends when all its pairs are matched. Let the player continue to the next round.
- The final round can contain fewer pairs.
- Show round progress and the number of mistakes.
- At the end, show a simple summary and a “Play again” button.

## Design and scope

Use a clean, mobile-friendly layout with large touch targets, visible selection states, and keyboard accessibility. Handle long labels gracefully.

Keep the first version small: **upload, preview, create, browse, share, and play**. Do not add timers, leaderboards, comments, multiplayer, or advanced learning features.

Before implementing, recommend a simple technical stack, outline the main screens and data model, and ask only questions that are essential to building the MVP.
