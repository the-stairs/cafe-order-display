"use client";

import Image from "next/image";
import { useState } from "react";
import { db } from "../utils/firebaseClient";
import { ref, push } from "firebase/database";

// 기본 테스트 Room ID (환경 변수로 설정 가능)
const DEFAULT_ROOM_ID = process.env.NEXT_PUBLIC_DEFAULT_ROOM_ID || "AB12";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState(DEFAULT_ROOM_ID);

  // 테스트 데이터를 Firebase에 추가하는 함수
  const addTestData = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      // Firebase 설정 확인
      console.log(
        "Firebase Database URL:",
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      );
      console.log("Firebase Config:", {
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });

      // 현재 설정된 룸 ID 사용

      // 랜덤한 주문번호 생성 (1001-9999 범위)
      const orderNumber = Math.floor(Math.random() * 8999) + 1001;

      // Firebase에 데이터 추가
      const ordersRef = ref(db, `rooms/${roomId}/orders`);
      console.log("Adding data to path:", `rooms/${roomId}/orders`);

      const result = await push(ordersRef, {
        number: orderNumber,
        status: "ready",
        createdAt: Date.now(),
      });

      console.log("Push result:", result);
      setMessage(`✅ 주문번호 ${orderNumber}이(가) 성공적으로 추가되었습니다!`);
    } catch (error) {
      console.error("Error adding test data:", error);
      setMessage(`❌ 데이터 추가 중 오류가 발생했습니다: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 여러 개의 테스트 데이터를 한 번에 추가하는 함수
  const addMultipleTestData = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const ordersRef = ref(db, `rooms/${roomId}/orders`);

      // 5개의 테스트 주문번호 생성
      const testOrders = [];
      for (let i = 0; i < 5; i++) {
        const orderNumber = Math.floor(Math.random() * 8999) + 1001;
        testOrders.push({
          number: orderNumber,
          status: "ready",
          createdAt: Date.now() + i * 1000, // 1초씩 차이를 두어 생성
        });
      }

      // 모든 주문을 Firebase에 추가
      for (const order of testOrders) {
        await push(ordersRef, order);
      }

      setMessage(
        `✅ ${testOrders.length}개의 테스트 주문이 성공적으로 추가되었습니다!`
      );
    } catch (error) {
      console.error("Error adding multiple test data:", error);
      setMessage(`❌ 데이터 추가 중 오류가 발생했습니다: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        {/* 카페 주문 디스플레이 프로젝트 소개 */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold mb-4">
            카페 주문번호 디스플레이 시스템
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Firebase Realtime Database를 사용한 실시간 주문번호 디스플레이
          </p>
        </div>

        {/* Firebase 테스트 버튼들 */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
          <h2 className="text-lg font-semibold mb-4">Firebase 테스트</h2>

          <div className="space-y-4">
            <button
              onClick={addTestData}
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "추가 중..." : "테스트 주문번호 1개 추가"}
            </button>

            <button
              onClick={addMultipleTestData}
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "추가 중..." : "테스트 주문번호 5개 추가"}
            </button>
          </div>

          {/* 메시지 표시 영역 */}
          {message && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-700 border rounded-lg">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>

        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            위 버튼을 클릭하여 Firebase Realtime Database에 테스트 데이터를
            추가할 수 있습니다.
          </li>
          <li className="mb-2 tracking-[-.01em]">
            Firebase 콘솔에서 데이터가 정상적으로 추가되는지 확인해보세요.
          </li>
          <li className="tracking-[-.01em]">
            Display 페이지에서 🔊 버튼을 클릭하여 사운드를 켜고 새 주문 알림음을
            테스트해보세요.
          </li>
        </ol>

        {/* Room ID 설정 */}
        <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg w-full max-w-md">
          <h2 className="text-lg font-semibold mb-4">Room ID 설정</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="roomId"
                className="block text-sm font-medium mb-2"
              >
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="예: AB12"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Display와 Controller가 같은 Room ID를 사용해야 연결됩니다
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href={`/controller?room=${roomId}`}
            rel="noopener noreferrer"
          >
            📱 Controller 페이지
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href={`/display?room=${roomId}`}
            rel="noopener noreferrer"
          >
            📺 Display 페이지
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
