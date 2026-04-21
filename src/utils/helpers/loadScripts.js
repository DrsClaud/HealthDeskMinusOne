const loadScripts = (scriptId, scriptHtml, callback) => {
  const existingScript = document.getElementById(scriptId);
  if (!existingScript) {
    const script = document.createElement("script");
    script.innerHTML = scriptHtml;
    script.id = scriptId;
    document.body.appendChild(script);
    script.onload = () => {
      if (callback) callback();
    };
  }
  if (existingScript && callback) callback();
};
export default loadScripts;
