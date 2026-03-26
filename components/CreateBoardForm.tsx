"use client"
import Turnstile from "react-turnstile";
import Link from "next/link";
import axios from 'axios';

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  increment,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreateBoardForm() {
  const [boardName, setBoardName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setMessage("");

    const n = boardName.trim();

    if (!captchaToken) {
      setMessage("Bitte CAPTCHA bestätigen");
      handleShowMessage();
      return;
    }

    if (!n) {
      setMessage("Bitte Board Namen eingeben");
      handleShowMessage();
      return;
    }

    const verifyRes = await fetch("/api/verify-turnstile", {
      method: "POST",
      body: JSON.stringify({ token: captchaToken }),
    });

    const verifyData = await verifyRes.json();

    setCaptchaToken(null);

    if (!verifyData.success) {
      setMessage("CAPTCHA fehlgeschlagen");
      handleShowMessage();
      return;
    }

    const boardId = n
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    try {
      setIsSubmitting(true);

      let banner = "";

      if (image) {
        banner = await handleImageUpload();
      }

      await setDoc(doc(db, "boards", boardId), {
        name: n,
        banner,
        createdAt: serverTimestamp(),
      });

      setBoardName("");
      setImage(null);
      setMessage("Board erstellt.");
      handleShowMessage();
    } catch (err) {
      console.error(err);
      setMessage("Fehler beim Erstellen des Boards");
      handleShowMessage();
    } finally {
      setIsSubmitting(false);
    }
  }

  const [show, setShow] = useState(false);

  const handleShowMessage = () => {
    setShow(true);

    setTimeout(() => {
      setShow(false);
    }, 3000);
  };

  return (
    <form className="max-w-5xl mr-4" onSubmit={handleSubmit}>
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
            <a href="/">Board</a>{" "}
            <strong>
              /
              <input
                className="bg-transparent outline-none text-stone-100 placeholder:text-stone-500"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="board-name"
              />
            </strong>
          </h1>
        </div>
        <button
          disabled={isSubmitting || !captchaToken}
          type="submit"
          className={`transition-colors text-black ${
            boardName.length > 0 ? "bg-white " : "bg-stone-500"
          } p-2 border-[1px] border-stone-500 hover:border-stone-300`}
        >
          {isSubmitting ? "Wird erstellt..." : "Erstellen"}
        </button>
      </div>

      <div className="mx-4 mb-4">
        <label className="cursor-pointer block border-[1px] border-dotted border-stone-500 hover:border-stone-300 transition">
          {image ? (
            <div className="relative">
              <img
                src={mounted ? URL.createObjectURL(image) : ""}
                alt="Banner"
                className="w-full h-[120px] sm:h-[140px] md:h-[160px] object-center"
              />
            </div>
          ) : (
            <div className="w-full h-[120px] sm:h-[140px] md:h-[160px] flex items-center justify-center text-stone-500">
              <span className="text-4xl leading-none">+ Banner hinzufügen</span>
            </div>
          )}
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
            className="mt-2 p-2 border-[1px] border-stone-500 hover:border-stone-300 text-white"
            onClick={handleRemoveImage}
          >
            Entfernen
          </button>
        )}
      </div>

      <div className="px-4 pb-4 flex flex-col gap-4">
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
            <p>{message}</p>
          </div>
        )}
      </div>
    </form>
  );
}
