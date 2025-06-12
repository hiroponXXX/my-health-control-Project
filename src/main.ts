import "./style.css";
// (1) 必要な Firebase SDK の関数をインポート
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore"; // Firestore を使うために追加
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth"; // Authentication を使うために追加

// (2) Firebase の設定を行うためのコード
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD3Hos1TtHt-p7gRuTSN5ARtVri826HLcI",
  authDomain: "my-health-control-project-0.firebaseapp.com",
  projectId: "my-health-control-project-0",
  storageBucket: "my-health-control-project-0.firebasestorage.app",
  messagingSenderId: "1096426987474",
  appId: "1:1096426987474:web:d1f4d31053a8be5bacb20b",
  measurementId: "G-N77HM26KV7",
};

// Initialize Firebase

// (3) Firebase アプリの初期化
const app = initializeApp(firebaseConfig);

// (4) 使用する Firebase サービスのインスタンスを取得（exportしておくと他のファイルから使える）
const analytics = getAnalytics(app);
export const db = getFirestore(app); // Firestore のインスタンス
export const auth = getAuth(app); // Authentication のインスタンス

// --- ここからアプリのメインロジック ---

// (5) 体調記録のデータ型を定義（TypeScriptのインターフェース！）
interface DailyHealthRecord {
  userId: string;
  date: string;
  mood: number;
  createdAt: Date;
}

document.addEventListener("DOMContentLoaded", () => {
  const inputElement = document.getElementById(
    "yourElementId"
  ) as HTMLInputElement;
  if (inputElement) {
    inputElement.valueAsDate = new Date();
  } else {
    console.error("要素が見つかりません！");
  }
});

// (6) DOMContentLoaded イベントリスナー: HTMLが完全に読み込まれたら実行
document.addEventListener("DOMContentLoaded", async () => {
  // HTML要素の取得
  const inputDate = document.getElementById("inputDate") as HTMLInputElement;
  const inputMood = document.getElementById("inputMood") as HTMLInputElement;
  const moodValueDisplay = document.getElementById(
    "moodValue"
  ) as HTMLSpanElement;
  const saveRecordBtn = document.getElementById(
    "saveRecordBtn"
  ) as HTMLButtonElement;
  const messageArea = document.getElementById(
    "messageArea"
  ) as HTMLParagraphElement;
  const recordList = document.getElementById("recordList") as HTMLUListElement;

  // 現在の日付をデフォルトで設定

  console.log(document.getElementById("yourElementId"));

  inputDate.valueAsDate = new Date();

  // 体調スライダーの値を表示する
  if (inputMood && moodValueDisplay) {
    moodValueDisplay.textContent = inputMood.value;
    inputMood.addEventListener("input", () => {
      moodValueDisplay.textContent = inputMood.value;
    });
  }

  let currentUser: any = null;

  // (7) ユーザー認証の監視
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      console.log("ユーザーログイン済み:", user.uid);
      loadAndDisplayRecords(currentUser.uid);
    } else {
      console.log("匿名ユーザーとしてログインを試みます...");
      signInAnonymously(auth)
        .then((userCredential) => {
          currentUser = userCredential.user;
          console.log("匿名ユーザーでログイン成功:", currentUser.uid);
          loadAndDisplayRecords(currentUser.uid);
        })
        .catch((error) => {
          console.error("匿名ログインエラー:", error);
          messageArea.textContent = "ログインに失敗しました。";
        });
    }
  });

  // (8) 記録保存ボタンのイベントリスナー
  saveRecordBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      messageArea.textContent =
        "ユーザーがログインしていません。お待ちください...";
      return;
    }

    const date = inputDate.value;
    const mood = parseInt(inputMood.value, 10);

    if (!date || isNaN(mood)) {
      messageArea.textContent = "日付と体調を正しく入力してください。";
      return;
    }

    const record: DailyHealthRecord = {
      userId: currentUser.uid,
      date: date,
      mood: mood,
      createdAt: new Date(),
    };

    try {
      await setDoc(
        doc(collection(db, "dailyRecords"), `${currentUser.uid}_${date}`),
        record
      );
      messageArea.textContent = "記録が正常に保存されました！";
      console.log("記録が保存されました:", record);
      loadAndDisplayRecords(currentUser.uid);
    } catch (e) {
      console.error("記録の保存エラー: ", e);
      if (e instanceof Error) {
        messageArea.textContent = `記録の保存に失敗しました: ${e.message}`;
      } else {
        messageArea.textContent = "記録の保存に失敗しました: 不明なエラー";
      }
    }
  });

  // (9) 過去の記録を読み込み、表示する関数
  async function loadAndDisplayRecords(userId: string) {
    recordList.innerHTML = "";

    try {
      const q = query(collection(db, "dailyRecords"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const li = document.createElement("li");
        li.textContent = "まだ記録がありません。";
        recordList.appendChild(li);
        return;
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data() as DailyHealthRecord;
        if (data.userId === userId) {
          const li = document.createElement("li");
          li.textContent = `${data.date}: 体調 ${data.mood}`;
          recordList.appendChild(li);
        }
      });
      console.log("過去の記録が読み込まれました。");
    } catch (e) {
      console.error("過去の記録の読み込みエラー:", e);
      if (e instanceof Error) {
        messageArea.textContent = `記録の読み込みに失敗しました: ${e.message}`;
      } else {
        messageArea.textContent = "記録の読み込みに失敗しました: 不明なエラー";
      }
    }
  }
});
