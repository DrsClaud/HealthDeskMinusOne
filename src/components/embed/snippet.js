// This is the code we'll give to other websites to copy/paste
export const embedCode = `<div id="hlthdsk-widget" style="max-width: 500px;">
  <style>
    .hlthdsk-input-container {
      display: flex;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    .hlthdsk-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    .hlthdsk-button {
      padding: 8px 16px;
      background-color: #117aca;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .hlthdsk-button:hover {
      background-color: #0e63a2;
    }
  </style>
  <div class="hlthdsk-input-container">
    <input 
      type="text" 
      class="hlthdsk-input" 
      placeholder="Ask My HealthDesk a question..."
      id="hlthdsk-input"
    >
    <button 
      class="hlthdsk-button" 
      onclick="window.open('${window.location.origin}/chat?message=' + encodeURIComponent(document.getElementById('hlthdsk-input').value), '_blank')"
    >
      Ask My HealthDesk
    </button>
  </div>
</div>`;

// Function to copy the embed code
export const copyEmbedCode = () => {
  navigator.clipboard.writeText(embedCode);
};
