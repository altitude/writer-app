import React from "react";
import { Editor } from "../components/Editor";

const introText = `This is a simple app to help you write your stories.\nYou can take it from here.`;

export default function Index() {
  return (
    <div className="root-container">
      <Editor initialText={introText} debug={true} />
    </div>
  );
}
