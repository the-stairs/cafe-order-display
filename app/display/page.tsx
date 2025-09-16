"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ref,
  onValue,
  onChildAdded,
  query,
  limitToLast,
  remove,
} from "firebase/database";
import { db } from "../../utils/firebaseClient";
import OrderCard from "../../components/OrderCard";
import { useSound } from "../../hooks/useSound";

type OrderStatus = "ready" | "done" | "removed";

interface Order {
  id: string;
  number: number;
  createdAt: number;
  expiresAt?: number;
  status: OrderStatus;
}

// 타입 가드 함수: 안전한 status 검증
function isValidOrderStatus(status: unknown): status is OrderStatus {
  return (
    typeof status === "string" && ["ready", "done", "removed"].includes(status)
  );
}

// 로딩 컴포넌트
function LoadingComponent() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🔄</div>
        <p className="text-xl text-gray-500">로딩 중...</p>
      </div>
    </div>
  );
}

// 실제 디스플레이 컴포넌트
function DisplayContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<{ [orderId: string]: number }>(
    {}
  );
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialAddedDoneRef = useRef<boolean>(false);

  // useRef로 최신 상태 관리 (Firebase 리스너 재구독 방지)
  const isSoundEnabledRef = useRef(isSoundEnabled);
  const playSoundRef = useRef<(() => void) | null>(null);
  const kickHighlightRef = useRef<((orderId: string) => void) | null>(null);

  // 사운드 훅 초기화 (환경 변수에서 사운드 URL 가져오기)
  const { play: playSound, resume: resumeAudio } = useSound(
    process.env.NEXT_PUBLIC_SOUND_URL || "/Ding-Dong-hd.mp3"
  );

  // playSound 함수의 최신 참조 유지
  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  // URL에서 Room ID 가져오기
  const roomId = searchParams.get("room");

  // Room ID가 없으면 메인 페이지로 리다이렉트
  useEffect(() => {
    if (!roomId) {
      console.log("Room ID가 없습니다. 메인 페이지로 리다이렉트합니다.");
      router.push("/");
      return;
    }
  }, [roomId, router]);

  // isSoundEnabled 상태의 최신 참조 유지
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  // localStorage에서 사운드 설정 불러오기
  useEffect(() => {
    const savedSoundSetting = localStorage.getItem("cafeDisplaySoundEnabled");
    if (savedSoundSetting !== null) {
      setIsSoundEnabled(JSON.parse(savedSoundSetting));
    }
  }, []);

  // 사운드 토글 함수 (iOS/Safari 호환성 포함)
  const toggleSound = useCallback(async () => {
    const newSoundState = !isSoundEnabled;
    setIsSoundEnabled(newSoundState);
    localStorage.setItem(
      "cafeDisplaySoundEnabled",
      JSON.stringify(newSoundState)
    );
    console.log("사운드 설정 변경:", newSoundState ? "켜짐" : "꺼짐");

    // iOS/Safari에서 사운드를 켤 때 AudioContext 활성화
    if (newSoundState) {
      await resumeAudio();
    }
  }, [isSoundEnabled, resumeAudio]);

  // 하이라이트 함수 (여러 주문 동시 지원, ref 기반)
  const kickHighlight = useCallback((orderId: string) => {
    console.log("새로운 주문 하이라이트 설정:", orderId);

    // 여러 주문 동시 하이라이트를 위한 상태 업데이트
    const expiryTime = Date.now() + 5000; // 5초 후 만료
    setNewOrderIds((prev) => ({
      ...prev,
      [orderId]: expiryTime,
    }));

    // 사운드 재생 (ref로 최신 상태 참조)
    if (isSoundEnabledRef.current && playSoundRef.current) {
      try {
        playSoundRef.current();
        console.log("딩동 알림음 재생");
      } catch (error) {
        console.warn("사운드 재생 실패:", error);
      }
    }
  }, []);

  // kickHighlight 함수의 안정적인 참조 유지
  useEffect(() => {
    kickHighlightRef.current = kickHighlight;
  }, [kickHighlight]);

  // 하이라이트 만료 관리 (1초마다 체크)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNewOrderIds((prev) => {
        const updated = { ...prev };
        let hasExpired = false;

        Object.keys(updated).forEach((orderId) => {
          if (updated[orderId] <= now) {
            delete updated[orderId];
            hasExpired = true;
          }
        });

        if (hasExpired) {
          console.log(
            "만료된 하이라이트 제거:",
            Object.keys(prev).filter((id) => !updated[id])
          );
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Firebase 연결 상태 감지
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const unsubscribeConnection = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      setIsConnected(connected);
      console.log("Firebase 연결 상태:", connected ? "연결됨" : "연결 끊김");
    });

    return () => unsubscribeConnection();
  }, []);

  // 서버 시간 오프셋 구독
  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsubscribeOffset = onValue(offsetRef, (snapshot) => {
      const offset = snapshot.val() || 0;
      setServerTimeOffset(offset);
      console.log("서버 시간 오프셋:", offset);
    });

    return () => unsubscribeOffset();
  }, []);

  // 현재 서버 시간 계산 함수
  const getServerTime = useCallback(() => {
    return Date.now() + serverTimeOffset;
  }, [serverTimeOffset]);

  // TTL 자동 제거 기능
  useEffect(() => {
    if (!roomId) return;

    const cleanupExpiredOrders = () => {
      const currentServerTime = getServerTime();
      console.log(
        "만료된 주문 정리 시작, 현재 서버 시간:",
        new Date(currentServerTime)
      );

      setOrders((prevOrders) => {
        const expiredOrderIds: string[] = [];
        const validOrders = prevOrders.filter((order) => {
          const isExpired =
            order.expiresAt && order.expiresAt <= currentServerTime;
          if (isExpired) {
            expiredOrderIds.push(order.id);
          }
          return !isExpired;
        });

        // Firebase에서도 만료된 주문 제거
        expiredOrderIds.forEach((orderId) => {
          const orderRef = ref(db, `rooms/${roomId}/orders/${orderId}`);
          remove(orderRef).catch((error) => {
            console.error("주문 제거 실패:", orderId, error);
          });
        });

        if (expiredOrderIds.length > 0) {
          console.log("만료된 주문 제거:", expiredOrderIds);
        }

        return validOrders;
      });
    };

    // 10초마다 만료된 주문 정리
    const cleanupInterval = setInterval(cleanupExpiredOrders, 10000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [roomId, getServerTime]);

  // 전체 주문 목록 동기화 (onValue)
  useEffect(() => {
    if (!roomId) return;

    console.log("주문 목록 동기화 시작, Room ID:", roomId);
    const ordersRef = ref(db, `rooms/${roomId}/orders`);

    const unsubscribeOrders = onValue(
      ordersRef,
      (snapshot) => {
        console.log("전체 주문 목록 동기화:", snapshot.val());

        if (snapshot.exists()) {
          const data = snapshot.val();
          const orderList: Order[] = [];

          // Firebase 데이터를 배열로 변환 (방어 코드 포함)
          Object.keys(data).forEach((key) => {
            const order = data[key];
            orderList.push({
              id: key,
              number: order.number || 0,
              createdAt: Number(order.createdAt) || 0,
              expiresAt: order.expiresAt ? Number(order.expiresAt) : undefined,
              status: isValidOrderStatus(order.status) ? order.status : "ready",
            });
          });

          // 생성시간 기준 최신순 정렬 (동일 시간일 경우 번호 기준 2차 정렬)
          orderList.sort((a, b) => {
            const timeDiff = b.createdAt - a.createdAt;
            if (timeDiff === 0) {
              return b.number - a.number; // 번호 기준 2차 정렬
            }
            return timeDiff;
          });

          setOrders(orderList);

          // 첫 번째 데이터 스냅샷을 성공적으로 받으면 플래그 설정
          if (!initialAddedDoneRef.current) {
            initialAddedDoneRef.current = true;
            console.log("초기 데이터 로드 완료, 신규 주문 하이라이트 활성화");
          }
        } else {
          console.log("주문 데이터가 없습니다");
          setOrders([]);

          // 빈 데이터더라도 초기 로드 완료로 간주
          if (!initialAddedDoneRef.current) {
            initialAddedDoneRef.current = true;
            console.log(
              "초기 데이터 로드 완료 (빈 데이터), 신규 주문 하이라이트 활성화"
            );
          }
        }
      },
      (error) => {
        console.error("주문 목록 구독 오류:", error);
      }
    );

    return () => unsubscribeOrders();
  }, [roomId]);

  // 신규 주문 감지 (onChildAdded with limitToLast)
  useEffect(() => {
    if (!roomId) return;

    console.log("신규 주문 감지 시작, Room ID:", roomId);
    const newOrdersQuery = query(
      ref(db, `rooms/${roomId}/orders`),
      limitToLast(50)
    );

    const unsubscribeNewOrders = onChildAdded(
      newOrdersQuery,
      (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();

        if (orderId && orderData) {
          console.log("신규 주문 감지:", { id: orderId, data: orderData });

          // 가드: 초기 데이터 로드가 완료되지 않았으면 하이라이트하지 않음
          if (!initialAddedDoneRef.current) {
            console.log("초기 로드 중이므로 하이라이트 건너뛰기:", orderId);
            return;
          }

          // 하이라이트 효과 트리거 (진짜 신규 주문만, ref 기반)
          if (kickHighlightRef.current) {
            kickHighlightRef.current(orderId);
          }
        }
      },
      (error) => {
        console.error("신규 주문 감지 오류:", error);
      }
    );

    return () => unsubscribeNewOrders();
  }, [roomId]); // ✅ kickHighlight 의존성 제거로 재구독 방지

  // Room ID가 없으면 로딩 상태 표시
  if (!roomId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔄</div>
          <p className="text-xl text-gray-500">Room ID를 확인하는 중...</p>
          <p className="text-sm text-gray-400 mt-2">
            잠시 후 메인 페이지로 이동됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      {/* 상단 헤더 */}
      <header className="flex justify-between items-center mb-8 px-10 h-20">
        <div>
          <h1 className="text-4xl font-bold text-[#0B0B0C]">준비 완료</h1>
          <p className="text-lg text-gray-600 mt-1">PICK UP</p>
        </div>

        {/* 연결 상태 및 Room 정보 표시 */}
        <div className="flex items-center gap-4">
          {/* 사운드 토글 버튼 */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
              isSoundEnabled
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            title={isSoundEnabled ? "소리 끄기" : "소리 켜기"}
          >
            <span className="text-lg">{isSoundEnabled ? "🔊" : "🔇"}</span>
            <span className="font-medium text-sm">
              {isSoundEnabled ? "소리 켜짐" : "소리 꺼짐 — 터치하여 켜기"}
            </span>
          </button>

          {/* 연결 상태 */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="font-medium">
              {isConnected ? "연결됨" : "연결 끊김"}
            </span>
          </div>

          <div className="text-sm text-gray-500">
            Room: <span className="font-mono font-medium">{roomId}</span>
          </div>

          {/* 서버 시간 오프셋 표시 (개발용) */}
          {serverTimeOffset !== 0 && (
            <div className="text-xs text-gray-400">
              Offset: {serverTimeOffset}ms
            </div>
          )}
        </div>
      </header>

      {/* 주문 카드 그리드 */}
      <main className="flex-1 px-10" role="main" aria-label="주문 디스플레이">
        {/* 섹션 라벨 */}
        <div className="mb-6 px-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              최근 완료
            </h2>
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs text-gray-400">
              총 {orders.length}개 주문
            </span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl text-gray-500">준비된 주문이 없습니다</p>
              <p className="text-sm text-gray-400 mt-2">
                새로운 주문이 준비되면 여기에 표시됩니다
              </p>
              {!isConnected && (
                <p className="text-xs text-red-500 mt-4">
                  ⚠️ 서버에 연결되지 않았습니다
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[1840px] mx-auto">
            {/* 반응형 격자 레이아웃 */}
            <div
              className="grid gap-6 auto-rows-max
              grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
            "
            >
              {orders.map((order, index) => {
                const isLatest = index === 0; // 첫 번째가 최신
                return (
                  <OrderCard
                    key={order.id}
                    number={order.number}
                    isNew={Boolean(newOrderIds[order.id])}
                    isLatest={isLatest}
                    className={`
                      ${
                        isLatest
                          ? "col-span-2 w-full max-w-[656px] lg:max-w-[740px] xl:max-w-[824px]"
                          : "w-full max-w-[320px] lg:max-w-[360px] xl:max-w-[400px]"
                      }
                      transition-all duration-300 ease-in-out
                    `}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 하단 정보 */}
      <footer className="mt-12 text-center text-blue-400 text-sm">
        <div className="flex justify-center items-center gap-6">
          <span>실시간 주문번호 디스플레이</span>
          <span>연결된 주문: {orders.length}개</span>
          <span>Room: {roomId}</span>
        </div>
      </footer>
    </div>
  );
}

// Suspense로 감싼 메인 컴포넌트
export default function DisplayPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <DisplayContent />
    </Suspense>
  );
}
