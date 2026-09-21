"use client";

import { useEffect, useRef, useState } from "react";
import type { PreviewStore } from "../demo-preview";
import { getStoreMap, SIMULATED_CUSTOMER_POINT } from "../../lib/store-map";
import styles from "./store-map.module.css";

export type StoreMapProps = { store: PreviewStore; busy?: boolean };

export default function StoreMap(props: StoreMapProps) {
  const { store } = props;
  return <SelectedStoreMap key={JSON.stringify([store.id, store.latitude, store.longitude, store.identityOrigin])} {...props} />;
}

function SelectedStoreMap({ store, busy = false }: StoreMapProps) {
  const [attempt, setAttempt] = useState<number | null>(null);
  const map = getStoreMap(store);
  return (
    <section className={styles.card} aria-label={`${store.name} 위치 참고`}>
      <div className={styles.heading}>
        <span className={styles.badge}>점포 위치 참고</span>
        <h3>{store.name}</h3>
        <p className={styles.address}>{store.address || "등록된 주소가 없어요. 점포 목록을 확인해주세요."}</p>
      </div>
      {map ? <>
        <p className={styles.distance}>가상 기준점에서 직선거리 약 {map.distanceMeters.toLocaleString("ko-KR")}m</p>
        <p className={styles.note}>시연용 가상 기준점 ({SIMULATED_CUSTOMER_POINT.latitude}, {SIMULATED_CUSTOMER_POINT.longitude})이며 내 실제 위치가 아니에요. GPS를 사용하지 않아요.</p>
      </> : <p className={styles.warning}>확인된 공개 점포 좌표가 없어 지도는 제공하지 않아요. 가상·미확인 점포는 주소와 점포 목록으로 확인해주세요.</p>}
      <p className={styles.note}>공개 자료의 위치 참고이며 출입구·도보 경로·현재 영업·재고를 보장하지 않아요. 상품·가격·거래는 모의예요.</p>
      {store.confidence === "low" && <p className={styles.warning}>좌표 신뢰도가 낮아요. 지하 점포 등은 지도 표시와 실제 출입구가 다를 수 있어 주소를 함께 확인해주세요.</p>}
      <p className={styles.note}>출처: {store.sourceIds?.join(" · ") || "확인된 출처 없음"} · 점포 변경은 기존 점포 목록에서 해주세요. 지도 조작은 구매 점포·요청·동의를 바꾸지 않아요.</p>
      {map && <>
        <p className={styles.privacy}>‘지도 보기’ 또는 ‘다시 보기’를 누르면 외부 OpenStreetMap에 연결해요. 공개 점포 좌표와 IP·브라우저 기본 정보가 전달될 수 있어요. 발화·개인정보·상품·거래·동의 내용은 지도 URL에 넣지 않아요.</p>
        <div className={styles.actions}>
          {attempt === null ? <button type="button" disabled={busy} onClick={() => setAttempt(1)}>지도 보기</button> : <>
            <button type="button" disabled={busy} onClick={() => setAttempt(current => (current ?? 0) + 1)}>다시 보기</button>
            <button type="button" className={styles.secondary} onClick={() => setAttempt(null)}>지도 닫기</button>
          </>}
        </div>
        {attempt !== null && <MapFrame key={attempt} url={map.url} name={store.name} />}
      </>}
      <p className={styles.note}>지도와 무관하게 점포 목록에서 조건을 확인하고 요청을 계속할 수 있어요.</p>
      <a className={styles.attribution} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>
    </section>
  );
}

function MapFrame({ url, name }: { url: string; name: string }) {
  const [phase, setPhase] = useState<"loading" | "unconfirmed" | "unavailable">("loading");
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    timer.current = setTimeout(() => {
      if (!active.current) return;
      active.current = false;
      setPhase("unavailable");
    }, 12_000);
    return () => { active.current = false; clearTimeout(timer.current); };
  }, []);
  function loaded() {
    if (!active.current) return;
    clearTimeout(timer.current);
    // Cross-origin onLoad also fires for some error documents; it is not rendering evidence.
    setPhase("unconfirmed");
  }
  function failed() {
    if (!active.current) return;
    active.current = false;
    clearTimeout(timer.current);
    setPhase("unavailable");
  }
  return <div className={styles.mapArea}>
    <p role="status" className={styles.note}>{phase === "loading"
      ? "외부 지도를 불러오는 중이에요. 주소로도 점포를 확인할 수 있어요."
      : phase === "unavailable"
        ? "지도 연결이 지연되거나 사용할 수 없어요. 주소를 확인하거나 ‘다시 보기’를 눌러주세요. 요청 기능은 그대로 사용할 수 있어요."
        : "지도 표시 여부는 자동으로 확인할 수 없어요. 비어 있거나 오류가 보이면 주소를 확인하거나 ‘다시 보기’를 눌러주세요."}</p>
    {phase !== "unavailable" && <iframe className={styles.frame} src={url} title={`${name} 위치 참고 — OpenStreetMap`} allow="geolocation 'none'" onLoad={loaded} onError={failed} />}
  </div>;
}
