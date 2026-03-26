"use client";
import axios from 'axios';

import { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import PostItem from "@/components/PostItem";
import Turnstile from "react-turnstile";


export default function ReplyForm({
  boardId,
  parent,
  onDone,
}: {
  boardId: string;
  parent: { id: string; rootId: string; depth: number };
  onDone?: () => void;
}) {
  const [username, setUsername] = useState("Anonymous");
  const [content, setContent] = useState("");
  const [popupMsg, setPopupMsg] = useState("");
  const [show, setShow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);

  const handleShowMessage = () => {
    setShow(true);
    setTimeout(() => setShow(false), 3000);
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setImage(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
  };

  const handleImageUpload = async (): Promise<string> => {
    if (!image) throw new Error("No image to upload");
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
      console.error(error);
      return "";
    }
  };

  async function handleSubmit(e: React.FormEvent) {
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

    if (!content.trim()) {
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
      setIsSubmitting(true);
      setPopupMsg("Post wird eingerichtet...");
      handleShowMessage();

      let imageUrl = null;
      if (image) imageUrl = await handleImageUpload();

      await addDoc(collection(db, "boards", boardId, "posts"), {
        username: username.trim(),
        content: content.trim(),
        createdAt: serverTimestamp(),
        parentId: parent.id,
        rootId: parent.rootId,
        depth: parent.depth + 1,
        childCount: 0,
        imageUrl: imageUrl,
      });

      await updateDoc(doc(db, "boards", boardId, "posts", parent.id), {
        childCount: increment(1),
      });

      setContent("");
      setCaptchaToken(null);
      setImage(null);
    onDone?.();
    } catch (err) {
      console.error(err);
      setPopupMsg("Antwort konnte nicht gespeichert werden");
      handleShowMessage();
    } finally {
      setIsSubmitting(false);
      setPopupMsg("Post wurde erfolgreich eingerichtet.");
      handleShowMessage();
    }
  }

  return (
    <form className="space-y-4 mr-4" onSubmit={handleSubmit}>
      <label className="mb-2 block font-medium text-stone-400">
        Anzeigename
      </label>
      <input
        className="w-full border border-white/20 bg-black/30 px-4 py-3 text-stone-100 outline-none transition focus:border-white/30"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />

      <label className="mb-2 block font-medium text-stone-400">
        Mitteilung
      </label>
      <textarea
        className="w-full border border-white/20 bg-black/30 px-4 py-3 text-stone-100 outline-none transition focus:border-white/30"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Post"
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
            Entfernen
          </button>
        )}
      </div>

      {image && (
        <img
          src={URL.createObjectURL(image)}
          className="max-w-[205px]"
        />
      )}

      <Turnstile
        sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onVerify={(token) => setCaptchaToken(token)}
        onExpire={() => setCaptchaToken(null)}
        key={captchaToken ? "verified" : "empty"}
      />

      {show && (
        <div className="p-3 bg-stone-600 text-white">
          <p>{popupMsg}</p>
        </div>
      )}

      <button
        disabled={isSubmitting || !captchaToken}
        type="submit"
        className={`transition-colors text-black ${
          content.length > 0 && !(isSubmitting || !captchaToken) ? "bg-white" : "bg-stone-500"
        } p-3`}
      >
        Posten
      </button>
    </form>
  );
}
