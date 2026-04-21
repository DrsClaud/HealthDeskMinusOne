import React from "react";
import reactStringReplace from "react-string-replace";
import { diseases, medications } from "../data";
import { useContext } from "react";
import { ChatContext } from "context/Chat";

export const useMessageParser = (openTab) => {
  const { setKeyword, setDescOpen } = useContext(ChatContext);
  const medicationsList = new RegExp(`(${medications.join("|")})`, "gi");
  const diseasesList = new RegExp(`(${diseases.join("|")})`, "gi");
  const bold = /\*\*(.*?)\*\*/gm;

  const openDesc = (tab, match) => {
    openTab(tab);

    setTimeout(() => {
      setKeyword(match);
      setDescOpen(tab);
    }, 50);
  };

  const reactStringReplaceRecursive = (input, pattern, fn, key = 0) => {
    const isEmpty = (item) => {
      if (!item) return true;
      if (Object.hasOwn(item, "props")) {
        return false;
      } else {
        return item.length ? false : true;
      }
    };

    if (!input) {
      return null;
    } else if (typeof input === "string") {
      return reactStringReplace(input, pattern, fn);
    }

    var output = [];
    for (var i = 0; i < input.length; i++) {
      const item = input[i];
      if (item) {
        if (typeof item === "string") {
          const next = reactStringReplace(item, pattern, fn);
          if (!isEmpty(next)) output.push(next);
        } else if (typeof item === "object") {
          if (
            Object.hasOwn(item, "props") &&
            Object.hasOwn(item.props, "children")
          ) {
            const next = reactStringReplaceRecursive(
              item.props.children,
              pattern,
              fn,
              key + 1
            );
            if (!isEmpty(next)) {
              const props = Object.assign(
                { key: "k" + key + "i" + i },
                item.props
              );
              output.push(React.createElement(item.type, props, next));
            }
          } else {
            const next = reactStringReplaceRecursive(
              item,
              pattern,
              fn,
              key + 1
            );
            if (!isEmpty(next)) output.push(next);
          }
        }
      }
    }

    return output;
  };

  const parseMessage = (message) => {
    let parsedText = message.message;

    parsedText = reactStringReplaceRecursive(
      parsedText,
      /#### (.*?)\n/gm,
      (match, k) => (
        <h4 style={{ margin: "10px 0 15px" }} key={`k_${k}`}>
          {match}
        </h4>
      )
    );

    parsedText = reactStringReplaceRecursive(
      parsedText,
      /### (.*?)\n/gm,
      (match, k) => (
        <h3 style={{ marginBottom: "10px" }} key={`k_${k}`}>
          {match}
        </h3>
      )
    );

    parsedText = reactStringReplaceRecursive(parsedText, bold, (match, i) => (
      <strong key={`i_${i}`}>{match}</strong>
    ));

    if (message.sender === "My HealthDesk") {
      parsedText = reactStringReplaceRecursive(
        parsedText,
        medicationsList,
        (match, j) => (
          <span
            key={`j_${j}`}
            className="fLink"
            onClick={() => openDesc("medications", match)}
          >
            {match}
          </span>
        )
      );

      parsedText = reactStringReplaceRecursive(
        parsedText,
        diseasesList,
        (match, m) =>
          match.length > 4 ? (
            <span
              key={`m_${m}`}
              className="fLink"
              onClick={() => openDesc("diseases", match)}
            >
              {match}
            </span>
          ) : (
            match
          )
      );
    }

    return parsedText;
  };

  return { parseMessage };
};
