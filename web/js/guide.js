// Fills the guide's message table from the same catalog the agent page uses, so the
// English texts in the guide can never drift from what agents actually see.
import { MESSAGES } from './core/messages.js';

for (const cell of document.querySelectorAll('[data-message-code]')) {
  const message = MESSAGES[cell.dataset.messageCode];
  if (message) cell.textContent = message.text;
}
