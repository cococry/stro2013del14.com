"use client"

import { useState, useEffect } from "react"

import Image from "next/image";
import CreateBoardForm from "@/components/CreateBoardForm";
;
import {
  collection,
  doc,
  orderBy,
  query,
  onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Board = {
  id: string;
  name?: string;
};

export default function Home() {

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsName, setBoardsName] = useState("boards");


  useEffect(() => {

    const boardsRef = collection(db, boardsName);
    const q = query(boardsRef, orderBy("createdAt", "desc"));

    setLoading(true);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })); 

      setBoards(nextPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardsName])


  return (
    <div className="w-full flex flex-col space-y-4 my-5 justify-center items-center">
    <div className="flex flex-col space-y-4 my-5 justify-center items-center max-w-4xl">
    <h1 className="italic text-4xl text-center">Stro2013del14</h1>
    <div className="p-5 bg-stone-900 border-white border-[1px] mx-5">
    <strong className="text-xl" >Übersicht</strong>
    <p className="mt-2">Stro2013del14 ist eine Austauschplattform, die durch die Arbeit der ASST¹
    im Jahre 2013 erstellt wurde — Stichwort: Strodel. Enthalten auf der Plattform ist ein Board-System 
    mit Möglichkeit zum anonymen Diskurs. Ursprünglich entstanden ist dieses Netzwerk durch die Strodel 
    Affäre, die 2013 im Rahmen des ETH Vorfalls Aufsehen erregte². Außerdem besteht die Möglichkeit, 
    als Nutzer eigene Boards zu kreiren, jedoch besteht dadurch kein Board-Eigentum.</p>

    <div className="border-l border-stone-300">
    <p className="ml-2 mt-3 font-sm text-stone-300">
    ¹ ASST: Aaron Strodel Söldner Trupp 
    </p>
    <p className="ml-2 mt-2 font-sm text-stone-300">
    ² Mehr dazu <a className="text-blue-500 underline" href="https://aaronstrodel.de/">hier</a>
    </p>
    </div>
    </div>

      <div className="flex gap-4 m-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-1md:h-[150px] xl:h-[220px] overflow-hidden">
          <img
            src={`/gif-${i}.gif`}
            alt={`gif-${i}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>

    <div className="p-5 bg-stone-900 border-white border-[1px] mx-5">
    <strong className="text-xl mb-2" >Boards</strong>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 ">
    {loading ? (<p className="text-stone-500">Boards werden geladen...</p>) : 
               ( boards.length === 0 ? <a className="text-stone-500">Es existieren keine Boards.</a> : boards.map((board, i) => (
                 <a className="text-xl underline" key={i} href={`/board/${board.id}`}>{board.name}</a>
    ))
    )} 
    
    </div>
    <button onClick={() => setOpen(!open)} className="text-xl border-l border-stone-500 hover:bg-stone-800 p-3 mt-2">
    {!open ? "Board erstellen" : "Abbrechen"} </button>
    {open && ( <CreateBoardForm/>) }
    </div>

    </div>
    </div>
    );
}
