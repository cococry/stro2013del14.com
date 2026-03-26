"use client";

import { useState } from "react";

import ReplyForm from "@/components/ReplyForm";

type MessageNode2 = {
  id: string;
  username: string;
  content: string;
  createdAt?: any;
  title: string;
  parentId: string | null;
  rootId: string;
  imageUrl?: string;
  depth: number;
  childCount?: number;
  children: MessageNode2[];
};

function formatDate(ts: any) {
  if (!ts?.toDate) return "Sende...";
  return ts.toDate().toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PostItem({
  boardId,
  node,
}: {
  boardId: string;
  node: MessageNode2;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);


  return (
  <div className="max-w-5xl" style={{ marginTop: 12 }}>
    
    <div
      style={{
        marginLeft: node.depth * 20,
        borderLeft: "1px solid #ccc",
        paddingLeft: 12,
      }}
    >
      <div>
        <strong>{node.username}</strong>{" "}
        <small>{formatDate(node.createdAt)}</small>
      </div>
      {node.title && (
        <h1 className="text-xl font-bold">{node.title}</h1>
      )}
      <p style={{ whiteSpace: "pre-wrap" }}>{node.content}</p>
      {node.imageUrl && (
        <div className="mt-2 mr-4">
        <img
        src={node.imageUrl}
        className="w-full md:max-w-2xl"
        alt="uploaded"
        />
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {node.children.length > 0 && (
          <button onClick={() => setCollapsed((v) => !v)}>
            {collapsed
              ? `Antworten anzeigen(${node.children.length})`
              : "Antworten ausblenden"}
          </button>
        )}

        <button className="font-bold" onClick={() => setShowReplyForm((v) => !v)}>
          {showReplyForm ? "Abbrechen" : "Antworten"}
        </button>
      </div>
    </div>

    {showReplyForm && (
      <div className="max-w-5xl" style={{ marginTop: 8 }}>
        <ReplyForm
          boardId={boardId}
          parent={{
            id: node.id,
            rootId: node.rootId,
            depth: node.depth,
          }}
          onDone={() => setShowReplyForm(false)}
        />
      </div>
    )}

    {/* children */}
    {!collapsed &&
      node.children.map((child) => (
        <PostItem key={child.id} boardId={boardId} node={child} />
      ))}
  </div>
);
}
