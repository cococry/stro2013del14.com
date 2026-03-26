"use client"
import axios from 'axios';
import Link from "next/link";

import {
  collection,
  orderBy,
  onSnapshot,
  query,
  addDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { useState, useEffect, useMemo } from "react"
import { db } from "@/lib/firebase";
import PostItem from "@/components/PostItem";
import Turnstile from "react-turnstile";

async function createToplevelPost(boardId: string, username: string, content: string, imageUrl: string | null, title: string) {
  const trimmedUsername = username.trim();
  const trimmedContent = content.trim();
  if (!trimmedUsername) {
    throw new Error("Please enter a username");
  }

  if (!trimmedContent) {
    throw new Error("Please enter a message");
  }

  const newDoc = await addDoc(collection(db, "boards", boardId, "posts"), {
    title: title,
    username: trimmedUsername,
    content: trimmedContent,
    createdAt: serverTimestamp(),
    parentId: null,
    rootId: "",   // temporary
    depth: 0,
    childCount: 0,
    imageUrl: imageUrl
  });


  await updateDoc(doc(db, "boards", boardId, "posts", newDoc.id), {
    rootId: newDoc.id,
  });
}


type ParentMessage = {
  id: string;
  rootId: string;
  depth: number;
};

type Message = {
  id: string;
  username: string;
  title: string;
  content: string;
  createdAt?: any;
  parentId: string | null;
  rootId: string;
  depth: number;
  childCount?: number;
};

type MessageNode = Message & {
  children: MessageNode[];
};

function buildMessageTree(messages: Message[]): MessageNode[] {
  const map = new Map<string, MessageNode>();
  const roots: MessageNode[] = [];

  for (const msg of messages) {
    map.set(msg.id, { ...msg, children: [] });
  }

  for (const msg of messages) {
    const node = map.get(msg.id)!;

    if (!msg.parentId) {
      roots.push(node);
    } else {
      const parent = map.get(msg.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}


export default function Board({ boardId }: {boardId: string}) {
  const [posts, setPosts] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const [popupMsg, setPopupMsg] = useState("");
  const [username, setUsername] = useState("Anonymous");
  const [title, setTitle] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boardName, setBoardName] = useState(boardId);
  const [bannerUrl, setBannerUrl] = useState("");

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleShowMessage = () => {
    setShow(true);

    setTimeout(() => {
      setShow(false);
    }, 3000);
  };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!captchaToken) {
      setPopupMsg("Bitte CAPTCHA bestätigen");
      handleShowMessage();
      return;
    }

    if (!username.trim()) {
      setPopupMsg("Bitte Geben Sie einen Anzeigenamen an.");
      handleShowMessage();
      return;
    }
    if (!title.trim()) {
      setPopupMsg("Bitte Geben Sie einen Titel ein.");
      handleShowMessage();
      return;
    }
    if (!msg.trim()) {
      setPopupMsg("Bitte Geben Sie Post-Inhalt ein.");
      handleShowMessage();
      return;
    }
    if (username.length < 3) {
      setPopupMsg("Ihr Anzeigename muss mindestens 3 Buchstaben lang sein.");
      handleShowMessage();
      return;
    }

    const verifyRes = await fetch("/api/verify-turnstile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: captchaToken }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      setPopupMsg("CAPTCHA fehlgeschlagen");
      setCaptchaToken(null);
      handleShowMessage();
      return;
    }

    try {
      setPopupMsg("Post wird eingerichtet...");
      handleShowMessage();

      let imageUrl = null;

      if (image) {
        imageUrl = await handleImageUpload();
      }

      await createToplevelPost(
        boardId,
        username.trim(),
        msg.trim(),
        imageUrl,
        title.trim()
      );

      setMsg("");
      setCaptchaToken(null);
    } catch (error) {
      console.error(error);
      setPopupMsg("Failed to post message");
      handleShowMessage();
    } finally {
      setPopupMsg("Post wurde erfolgreich eingerichtet.");
      handleShowMessage();
    }
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!boardId) return;

    const unsubBoard = onSnapshot(doc(db, "boards", boardId), (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setBoardName(data.name || boardId);
        setBannerUrl(data.banner || "");
      } else {
        setBoardName(boardId);
        setBannerUrl("");
      }
    });

    return () => unsubBoard();
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    const postsRef = collection(db, "boards", boardId, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    setLoading(true);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setPosts(nextPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardId]);

  const postsTree = useMemo(() => buildMessageTree(posts), [posts]);

  const [image, setImage] = useState<File | null>(null);

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
  };

  const handleImageUpload = async (): Promise<string> => {
    if (!image) {
      throw new Error("No image to upload");
    }
    const formData = new FormData();
    formData.append("file", image);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string
    );

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );
      return response.data.secure_url;
    } catch (error) {
      console.error("Error uploading the image:", error);
      return "";
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <div className="my-5">
      <div className="flex justify-between m-4">
        <div className="flex gap-2 justify-center items-center">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center text-stone-200 hover:bg-stone-900 transition"
            aria-label="Home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5.25 9.75V21h13.5V9.75" />
              <path d="M9.75 21v-6h4.5v6" />
            </svg>
          </Link>
          <h1 className="text-2xl">
            <a href="/">Board</a> <strong>/{boardName}</strong>
          </h1>
        </div>
        <button
          onClick={() => setOpen(!open)}
          type="button"
          className="bg-stone-100 p-2 border-[1px] border-stone-500 hover:border-stone-300 text-black"
        >
          <span>{!open ? "Posten" : "Abbrechen"}</span>
        </button>
      </div>

      {bannerUrl && (
        <div className="flex justify-center items-center">
        <div className="w-full md:max-w-4xl  mx-4 mb-4 border-[1px] border-stone-500 overflow-hidden">
          <img
            src={bannerUrl}
            alt={boardName}
            className="w-full h-[120px] sm:h-[140px] md:h-[160px] object-cover"
          />
        </div>
        </div>
      )}

      {open && (
        <div className="max-w-5xl">
          <div className="p-5">
            <form className=" space-y-4" onSubmit={handleSubmit}>
              <label className="mb-2 block font-medium text-stone-400">
                Anzeigename
              </label>
              <input
                className="w-full border border-white/20 bg-black/30 px-4 py-3 text-stone-100 outline-none transition focus:border-white/30"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Anzeigename"
              />

              <label className="block font-medium text-stone-400">Titel</label>
              <input
                className="w-full border border-white/20 bg-black/30 px-4 py-3 text-stone-100 outline-none transition focus:border-white/30"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
              />

              <label className="block font-medium text-stone-400">
                Mitteilung
              </label>

              <textarea
                className="w-full border border-white/20 bg-black/30 px-4 py-3 text-stone-100 outline-none transition focus:border-white/30"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Mitteilung"
              />

              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center justify-center p-2 border-stone-500 border-[1px] hover:border-stone-300 font-medium transition">
                  Bild auswählen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>

                {image && (
                  <button
                    type="button"
                    className="p-2 border-[1px] border-stone-500 hover:border-stone-300 text-white"
                    onClick={handleRemoveImage}
                  >
                    <span>Entfernen</span>
                  </button>
                )}
              </div>

              {image && mounted && (
                <img src={URL.createObjectURL(image)} className="max-w-[205px]" />
              )}

              {mounted && (
                <Turnstile
                  sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  key={captchaToken ? "verified" : "empty"}
                />
              )}

              {show && (
                <div className="p-3 bg-stone-600 text-white">
                  <p>{popupMsg}</p>
                </div>
              )}

              <button
                disabled={!mounted || !captchaToken}
                type="submit"
                className={`transition-colors text-black ${
                  msg.length > 0 ? "bg-white " : "bg-stone-500"
                } p-3`}
              >
                Posten
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="ml-4">
        {posts.length === 0 ? (
          <p
            className={`text-center text-stone-500 ${
              loading ? "animate-pulse" : ""
            }`}
          >
            {loading ? "Posts werden geladen..." : "Noch keine Posts."}
          </p>
        ) : (
          <div>
            {postsTree.map((node) => (
              <PostItem key={node.id} boardId={boardId} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
