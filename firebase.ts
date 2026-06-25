import React, { useState, useEffect, useMemo, ChangeEvent } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  getDocs,
} from "firebase/firestore";
import { 
  BookOpen, 
  GraduationCap, 
  Plus, 
  Search, 
  SlidersHorizontal,
  Info,
  HeartPulse,
  Stethoscope,
  Activity,
  FileText,
  FileUp,
  FileDown,
  Share2,
  Copy,
  Check,
  Globe,
  RefreshCw,
} from "lucide-react";
import { db, initAuth, handleFirestoreError, OperationType } from "./firebase";
import { EducationItem, ItemStatus, STATUS_MAP, getCategoryStyles, EducationHistoryItem } from "./types";
import Dashboard from "./components/Dashboard";
import ItemCard from "./components/ItemCard";
import ItemModal from "./components/ItemModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import { exportToExcel, importFromExcel } from "./utils/excel";
import GoogleDriveSync from "./components/GoogleDriveSync";

export default function App() {
  // Authentication status
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Group synchronization / shared workspace code
  const [groupCode, setGroupCode] = useState<string>(() => {
    try {
      return localStorage.getItem("edu_group_code") || "shared-global";
    } catch {
      return "shared-global";
    }
  });
  const [inputGroupCode, setInputGroupCode] = useState(groupCode);
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);

  // Firestore collections states
  const [items, setItems] = useState<EducationItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");

  // Modal open states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EducationItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EducationItem | null>(null);

  // Success message alert state
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active Tab state ("dashboard" or "items")
  const [activeTab, setActiveTab] = useState<"dashboard" | "items">("dashboard");

  // Standard interactive alert dismiss handler
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Auth setup on mount
  useEffect(() => {
    initAuth()
      .then((uid) => {
        setUserId(uid);
      })
      .catch((err) => {
        console.error("Auth initialization failed:", err);
        setAuthError("データベースの認証に失敗しました。時間を置いて再読込してください。");
        setIsLoading(false);
      });
  }, []);

  // Fetch education items and categories from Firestore once authenticated and groupCode is set
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);

    // 1. Subscribe to Education Items
    const qItems = query(
      collection(db, "educationItems"),
      where("groupCode", "==", groupCode)
    );

    const unsubscribeItems = onSnapshot(
      qItems,
      (snapshot) => {
        const fetchedItems: EducationItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedItems.push({
            id: docSnap.id,
            ...data,
          } as EducationItem);
        });

        // Sort client-side by updatedAt descending to bypass composite indexing requirement
        fetchedItems.sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        });

        setItems(fetchedItems);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, "educationItems");
      }
    );

    // 2. Subscribe to Custom Categories
    const qCategories = query(
      collection(db, "categories"),
      where("groupCode", "==", groupCode)
    );

    const unsubscribeCategories = onSnapshot(
      qCategories,
      (snapshot) => {
        const catList: string[] = [];
        snapshot.forEach((docSnap) => {
          const catName = docSnap.data().name;
          if (catName && !catList.includes(catName)) {
            catList.push(catName);
          }
        });
        
        // If user has absolutely no categories stored, help them feel comfortable with default suggestions
        if (catList.length === 0) {
          setCategories(["臨床医学", "看護技術", "医療安全", "薬理学", "研修・実習", "その他"]);
        } else {
          setCategories(catList.sort());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "categories");
      }
    );

    return () => {
      unsubscribeItems();
      unsubscribeCategories();
    };
  }, [userId, groupCode]);

  // Perform client-side filter and search calculations
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item) return false;
      const title = item.title || "";
      const desc = item.description || "";
      const matchesSearch = 
        title.toLowerCase().includes((searchQuery || "").toLowerCase()) ||
        desc.toLowerCase().includes((searchQuery || "").toLowerCase());
      
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, statusFilter, categoryFilter]);

  // CRUD actions
  const handleAddNewClick = () => {
    setSelectedItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditClick = (item: EducationItem) => {
    setSelectedItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteClick = (item: EducationItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleAddNewCategory = async (name: string): Promise<boolean> => {
    if (!userId || !name.trim()) return false;
    try {
      await addDoc(collection(db, "categories"), {
        name: name.trim(),
        userId: userId,
        groupCode: groupCode,
        createdAt: new Date().toISOString()
      });
      setAlertMessage({ type: "success", text: `カテゴリー「${name.trim()}」を追加しました！` });
      return true;
    } catch (err) {
      console.error("Failed to add category to Firestore:", err);
      setAlertMessage({ type: "error", text: "カテゴリーの追加に失敗しました。" });
      handleFirestoreError(err, OperationType.CREATE, "categories");
      return false;
    }
  };

  const handleDeleteCategory = async (name: string): Promise<boolean> => {
    if (!userId || !name.trim()) return false;
    try {
      const q = query(
        collection(db, "categories"),
        where("name", "==", name.trim())
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // If it's a default category, we convert the OTHER defaults to custom categories in Firestore,
        // thereby excluding the deleted one!
        const defaults = ["臨床医学", "看護技術", "医療安全", "薬理学", "研修・実習", "その他"];
        if (defaults.includes(name.trim())) {
          const othersToSave = defaults.filter(d => d !== name.trim());
          const promises = othersToSave.map(cat => 
            addDoc(collection(db, "categories"), {
              name: cat,
              userId,
              groupCode,
              createdAt: new Date().toISOString()
            })
          );
          await Promise.all(promises);
          setAlertMessage({ type: "success", text: `カテゴリー「${name}」を削除しました。` });
          return true;
        } else {
          setAlertMessage({ type: "error", text: "カテゴリーが見つかりませんでした。" });
          return false;
        }
      }

      const docsToDelete = querySnapshot.docs.filter(docSnap => {
        const data = docSnap.data();
        const catGroup = data.groupCode || "shared-global";
        return catGroup === groupCode;
      });

      const deletePromises = docsToDelete.map(docSnap => deleteDoc(doc(db, "categories", docSnap.id)));
      await Promise.all(deletePromises);
      setAlertMessage({ type: "success", text: `カテゴリー「${name}」を削除しました。` });
      return true;
    } catch (err) {
      console.error("Failed to delete category from Firestore:", err);
      setAlertMessage({ type: "error", text: "カテゴリーの削除に失敗しました。" });
      return false;
    }
  };

  const handleSaveItem = async (data: {
    title: string;
    description: string;
    understandingCheck: string;
    category: string;
    status: ItemStatus;
    progress: number;
    date: string;
    startTime: string;
    endTime: string;
    history?: EducationHistoryItem[];
    instructor?: string;
    isCopy?: boolean;
  }) => {
    if (!userId) return;

    try {
      const now = new Date().toISOString();
      if (selectedItem && !data.isCopy) {
        // Update existing item
        const docRef = doc(db, "educationItems", selectedItem.id);
        await updateDoc(docRef, {
          title: data.title,
          description: data.description,
          understandingCheck: data.understandingCheck,
          category: data.category,
          status: data.status,
          progress: data.progress,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          history: data.history || [],
          instructor: data.instructor || "",
          groupCode: selectedItem.groupCode || groupCode,
          updatedAt: now,
        });
        setAlertMessage({ type: "success", text: "教育項目を正常に更新しました！" });
      } else {
        // Add new item (or as a copy)
        await addDoc(collection(db, "educationItems"), {
          title: data.title,
          description: data.description,
          understandingCheck: data.understandingCheck,
          category: data.category,
          status: data.status,
          progress: data.progress,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          history: data.history || [],
          instructor: data.instructor || "",
          userId: userId,
          groupCode: groupCode,
          createdAt: now,
          updatedAt: now,
        });
        setAlertMessage({ 
          type: "success", 
          text: data.isCopy 
            ? `「${data.title}」として新しく複製コピーを作成しました！` 
            : "新しい教育項目を追加しました！" 
        });
      }
      
      // Auto-switch to items tab and clear filters so they can instantly see the new item
      setActiveTab("items");
      setCategoryFilter("all");
      setStatusFilter("all");
      setSearchQuery("");
      
      setIsItemModalOpen(false);
    } catch (err) {
      console.error("Save item error:", err);
      setAlertMessage({ type: "error", text: "データの保存に失敗しました。やり直してください。" });
      handleFirestoreError(err, selectedItem ? OperationType.UPDATE : OperationType.CREATE, "educationItems");
    }
  };

  const handleExcelExport = () => {
    if (items.length === 0) {
      setAlertMessage({ type: "error", text: "エクスポートする教育項目がありません。" });
      return;
    }
    try {
      exportToExcel(items);
      setAlertMessage({ type: "success", text: "研修項目をExcelファイルとしてエクスポートしました！" });
    } catch (err) {
      console.error("Failed to export to Excel:", err);
      setAlertMessage({ type: "error", text: "Excelファイルのエクスポートに失敗しました。" });
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setIsLoading(true);
      const importedItems = await importFromExcel(file);
      
      if (importedItems.length === 0) {
        setAlertMessage({ type: "error", text: "インポート可能なデータが見つかりませんでした。" });
        setIsLoading(false);
        return;
      }

      const now = new Date().toISOString();
      let addedCount = 0;
      let newCategoriesAdded = 0;
      const currentCategories = [...categories];

      // Import each item sequentially
      for (const item of importedItems) {
        if (!item.title) continue;

        // Ensure category exists
        const catName = (item.category || "その他").trim();
        if (catName && !currentCategories.includes(catName)) {
          // Add category to database
          await addDoc(collection(db, "categories"), {
            name: catName,
            userId: userId,
            groupCode: groupCode,
            createdAt: now,
          });
          currentCategories.push(catName);
          newCategoriesAdded++;
        }

        // Add item
        await addDoc(collection(db, "educationItems"), {
          title: item.title,
          description: item.description || "",
          understandingCheck: item.understandingCheck || "",
          category: catName,
          status: item.status || "not_started",
          progress: item.status === "completed" ? 100 : item.status === "in_progress" ? 50 : 0,
          date: item.date || now.split("T")[0],
          startTime: item.startTime || "10:00",
          endTime: item.endTime || "11:00",
          history: [],
          instructor: item.instructor || "",
          userId: userId,
          groupCode: groupCode,
          createdAt: now,
          updatedAt: now,
        });

        addedCount++;
      }

      setAlertMessage({ 
        type: "success", 
        text: `${addedCount}件の研修項目をインポートしました！${newCategoriesAdded > 0 ? `（新規カテゴリー${newCategoriesAdded}件追加）` : ""}` 
      });

      // Clear input value so same file can be imported again
      e.target.value = "";
      setActiveTab("items");
      setCategoryFilter("all");
      setStatusFilter("all");
      setSearchQuery("");
    } catch (err: any) {
      console.error("Excel import error:", err);
      setAlertMessage({ 
        type: "error", 
        text: `インポートに失敗しました: ${err.message || "ファイル形式を確認してください。"}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteDoc(doc(db, "educationItems", itemToDelete.id));
      setAlertMessage({ type: "success", text: "選択された教育項目を削除しました。" });
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete item error:", err);
      setAlertMessage({ type: "error", text: "項目の削除に失敗しました。" });
      handleFirestoreError(err, OperationType.DELETE, "educationItems");
    }
  };

  // Restore/Import backup from Google Drive
  const handleRestoreData = async (backupCategories: string[], backupItems: any[], overwrite: boolean): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);
    try {
      // 1. If overwrite mode is true, delete all current items and categories
      if (overwrite) {
        const qItems = query(
          collection(db, "educationItems"),
          where("groupCode", "==", groupCode)
        );
        const snapshotItems = await getDocs(qItems);
        const deleteItemPromises = snapshotItems.docs.map((docSnap) => deleteDoc(doc(db, "educationItems", docSnap.id)));
        await Promise.all(deleteItemPromises);

        const qCats = query(
          collection(db, "categories"),
          where("groupCode", "==", groupCode)
        );
        const snapshotCats = await getDocs(qCats);
        const deleteCatPromises = snapshotCats.docs.map((docSnap) => deleteDoc(doc(db, "categories", docSnap.id)));
        await Promise.all(deleteCatPromises);
      }

      // 2. Import Categories
      const currentCats = [...categories];
      const categoryPromises = backupCategories.map(async (catName) => {
        if (overwrite || !currentCats.includes(catName)) {
          await addDoc(collection(db, "categories"), {
            name: catName,
            userId: userId,
            groupCode: groupCode,
            createdAt: new Date().toISOString()
          });
          currentCats.push(catName);
        }
      });
      await Promise.all(categoryPromises);

      // 3. Import Education Items
      let existingTitles: string[] = [];
      if (!overwrite) {
        const qItems = query(
          collection(db, "educationItems"),
          where("groupCode", "==", groupCode)
        );
        const snapshotItems = await getDocs(qItems);
        existingTitles = snapshotItems.docs.map((docSnap) => {
          const d = docSnap.data();
          return `${d.title || ""}_${d.category || ""}`;
        });
      }

      const itemPromises = backupItems.map(async (item: any) => {
        const key = `${item.title || ""}_${item.category || ""}`;
        if (overwrite || !existingTitles.includes(key)) {
          await addDoc(collection(db, "educationItems"), {
            title: item.title || "",
            description: item.description || "",
            understandingCheck: item.understandingCheck || "",
            category: item.category || "その他",
            status: item.status || "not_started",
            progress: typeof item.progress === "number" ? item.progress : 0,
            date: item.date || new Date().toISOString().split("T")[0],
            startTime: item.startTime || "09:00",
            endTime: item.endTime || "10:00",
            userId: userId,
            groupCode: groupCode,
            instructor: item.instructor || "",
            history: item.history || [],
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });
      await Promise.all(itemPromises);

      return true;
    } catch (error) {
      console.error("Database restore failed:", error);
      handleFirestoreError(error, OperationType.WRITE, "restoreBackup");
      setAlertMessage({ type: "error", text: "データベースの同期・復元に失敗しました。" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Clone/Duplicate current workspace to a new sync code (Save a copy)
  const handleWorkspaceSaveAsCopy = async () => {
    if (!userId) {
      setAlertMessage({ type: "error", text: "認証情報が見つかりません。" });
      return;
    }
    if (items.length === 0 && categories.length === 0) {
      setAlertMessage({ type: "error", text: "コピーするデータがありません。" });
      return;
    }

    const newCode = "ce-sync-COPY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const confirmed = window.confirm(
      `現在のすべてのデータ（カテゴリー ${categories.length}件、研修項目 ${items.length}件）を複製し、新しい同期コード「${newCode}」としてコピー保存しますか？`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // 1. Copy Categories to the new groupCode
      const categoryPromises = categories.map(async (catName) => {
        await addDoc(collection(db, "categories"), {
          name: catName,
          userId: userId,
          groupCode: newCode,
          createdAt: new Date().toISOString()
        });
      });
      await Promise.all(categoryPromises);

      // 2. Copy Education Items to the new groupCode
      const itemPromises = items.map(async (item) => {
        await addDoc(collection(db, "educationItems"), {
          title: item.title,
          description: item.description || "",
          understandingCheck: item.understandingCheck || "",
          category: item.category || "その他",
          status: item.status || "not_started",
          progress: item.progress || 0,
          date: item.date || new Date().toISOString().split("T")[0],
          startTime: item.startTime || "09:00",
          endTime: item.endTime || "10:00",
          userId: userId,
          groupCode: newCode,
          instructor: item.instructor || "",
          history: item.history || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(itemPromises);

      // 3. Update active groupCode and localStorage
      try {
        localStorage.setItem("edu_group_code", newCode);
      } catch {}
      
      setGroupCode(newCode);
      setInputGroupCode(newCode);
      setAlertMessage({ 
        type: "success", 
        text: `全データを正常にコピー複製し、新しい同期コード「${newCode}」に切り替えました。このコードを共有してマルチPCでご利用いただけます！` 
      });
      setIsSyncSettingsOpen(false);
    } catch (error) {
      console.error("Workspace save copy failed:", error);
      setAlertMessage({ type: "error", text: "データのコピー保存に失敗しました。" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" id="main-app">
      {alertMessage && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-[fadeIn_0.2s_ease-out]"
          id="toast-notification"
        >
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center gap-3 ${
            alertMessage.type === "success" 
              ? "bg-blue-50 border-blue-100 text-blue-900" 
              : "bg-rose-50 border-rose-150 text-rose-900"
          }`}>
            <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
            <p className="text-xs font-extrabold">{alertMessage.text}</p>
          </div>
        </div>
      )}

      {/* Styled Top Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm" id="header-bar">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20" id="logo-branding">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  CE教育アプリ
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              id="excel-import-input"
              onChange={handleExcelImport}
            />
            <label
              htmlFor="excel-import-input"
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-3 rounded-2xl border border-slate-200 shadow-xs cursor-pointer active:scale-95 hover:scale-[1.02] transition-all"
              id="import-excel-btn"
            >
              <FileUp className="w-4 h-4 text-emerald-600" />
              <span>Excelインポート</span>
            </label>
            <button
              onClick={handleExcelExport}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-3 rounded-2xl border border-slate-200 shadow-xs cursor-pointer active:scale-95 hover:scale-[1.02] transition-all"
              id="export-excel-btn"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span>Excelエクスポート</span>
            </button>
            <button
              onClick={handleAddNewClick}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black px-6 py-3.5 rounded-2xl shadow-md shadow-blue-600/10 hover:shadow-blue-700/20 active:scale-95 hover:scale-[1.02] transition-all"
              id="add-learning-item-btn"
            >
              <Plus className="w-5 h-5" />
              <span>研修項目を新規追加</span>
            </button>
          </div>
        </div>
      </header>

      {/* Core Body Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        
        {/* Error notification */}
        {authError && (
          <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-3xl text-sm font-extrabold text-center" id="auth-error-alert">
            {authError}
          </div>
        )}

        {/* Cloud Sync & Group Sharing Settings Widget */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs" id="sync-settings-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-800">
                    クラウド同期＆マルチPC共有
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    接続中
                  </span>
                </div>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">
                  現在の同期コード: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-black text-xs">{groupCode}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(groupCode);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                title="同期コードをコピー"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? "コピー完了" : "コードをコピー"}</span>
              </button>
              
              <button
                onClick={() => setIsSyncSettingsOpen(!isSyncSettingsOpen)}
                className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-black bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isSyncSettingsOpen ? "設定を閉じる" : "同期・バックアップ設定"}</span>
              </button>
            </div>
          </div>

          {isSyncSettingsOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-[fadeIn_0.15s_ease-out]">
              <div className="p-4 bg-blue-50/30 border border-blue-100/60 rounded-2xl space-y-3">
                <p className="text-xs text-blue-900 font-bold leading-relaxed">
                  💡 <strong>データの共有方法:</strong><br />
                  他のパソコンやタブレット、スマートフォン等で本アプリを開き、<strong>全く同じ同期コード</strong>を入力してください。
                  リアルタイムでデータベースが共有され、データの保存や編集がすべての端末に即座に反映されるようになります。
                </p>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <label htmlFor="group-code-input" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      同期コードを入力（半角英数字、ハイフン推奨）
                    </label>
                    <input
                      id="group-code-input"
                      type="text"
                      value={inputGroupCode}
                      onChange={(e) => setInputGroupCode(e.target.value.trim())}
                      placeholder="例: my-clinic-dept-a"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-250 bg-white font-mono font-bold text-slate-800 text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      maxLength={30}
                    />
                  </div>
                  
                  <div className="flex items-end gap-2 mt-2 sm:mt-0">
                    <button
                      type="button"
                      onClick={() => {
                        const randomCode = "ce-sync-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                        setInputGroupCode(randomCode);
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all border border-slate-200 cursor-pointer h-9"
                    >
                      ランダム生成
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (!inputGroupCode) {
                          setAlertMessage({ type: "error", text: "同期コードを入力してください。" });
                          return;
                        }
                        try {
                          localStorage.setItem("edu_group_code", inputGroupCode);
                        } catch {
                          // ignore sandbox errors
                        }
                        setGroupCode(inputGroupCode);
                        setAlertMessage({ type: "success", text: `同期コードを「${inputGroupCode}」に変更しました。データを読み込みます。` });
                        setIsSyncSettingsOpen(false);
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-600/10 cursor-pointer h-9"
                    >
                      同期を適用
                    </button>
                  </div>
                </div>
              </div>

              {/* Save a copy / Workspace Replication Block */}
              <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3">
                <div>
                  <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <Copy className="w-4 h-4 text-indigo-600" />
                    <span>現在のデータベースの複製を作成（Save a Copy）</span>
                  </h4>
                  <p className="text-[11px] text-indigo-750 font-semibold mt-1 leading-relaxed">
                    現在のすべての研修項目・カテゴリーデータを丸ごと複製し、新規作成された同期コードにコピー保存します。<br />
                    元データは変更されずそのまま残り、新規に切り替わったコピー環境で作業を続けられます（部署ごとの配布や、テンプレート複製、年次バックアップなどに便利です）。
                  </p>
                </div>
                
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={handleWorkspaceSaveAsCopy}
                    className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5 hover:scale-[1.01]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>別コードで複製（Save a copy）を作成する</span>
                  </button>
                </div>
              </div>

              <GoogleDriveSync
                groupCode={groupCode}
                items={items}
                categories={categories}
                onRestoreData={handleRestoreData}
                userId={userId}
                setUserId={setUserId}
                setAlertMessage={setAlertMessage}
              />
            </div>
          )}
        </div>

        {/* Tab Selection Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1 shadow-xs" id="main-tabs-nav">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 py-3.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Activity className="w-4 h-4 md:w-5 md:h-5" />
            <span>分析ダッシュボード（進捗・時間）</span>
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`flex-1 py-3.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "items"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span>項目一覧（タッチして編集）</span>
          </button>
        </div>

        {/* TAB 1: Dashboard Progress and stats */}
        {activeTab === "dashboard" && (
          <div className="animate-[fadeIn_0.25s_ease-out]" id="tab-dashboard-view">
            <Dashboard 
              items={items} 
              categories={categories} 
              isLoading={isLoading} 
              onSelectCategory={(catName) => {
                setCategoryFilter(catName);
                setStatusFilter("all");
                setSearchQuery("");
                setActiveTab("items");
              }}
            />
          </div>
        )}

        {/* TAB 2: Learning Filters and Item list section */}
        {activeTab === "items" && (
          <div className="space-y-6 animate-[fadeIn_0.25s_ease-out]" id="tab-items-list-view">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2 tracking-tight">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <span>指導・研修項目一覧</span>
                </h2>
                <p className="text-slate-400 text-xs font-semibold">各項目をタッチすることで、研修内容の編集・進捗更新が可能です。</p>
              </div>

              {/* Filter and Search controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                {/* Search bar */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="研修タイトル・内容から検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-250 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-xs font-bold text-slate-700 transition-all placeholder:text-slate-400 shadow-inner"
                    id="search-input"
                  />
                </div>

                {/* Status and Category inline selectors */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ItemStatus | "all")}
                  className="px-3.5 py-3 bg-white border border-slate-250 text-xs text-slate-700 font-bold rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 cursor-pointer shadow-sm"
                  id="status-filter-select"
                >
                  <option value="all">すべての進捗状況</option>
                  {Object.keys(STATUS_MAP).map((key) => (
                    <option key={key} value={key}>
                      {STATUS_MAP[key as ItemStatus].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 研修カテゴリー選択リスト */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4" id="category-list-section">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    研修カテゴリーで絞り込み
                  </h3>
                  <p className="text-slate-400 text-[11px] font-semibold">カテゴリーを選択して研修項目を絞り込めます。不要なカテゴリーは「✕」で削除可能です。</p>
                </div>
                <div className="text-[10px] bg-slate-50 text-slate-500 font-bold px-2.5 py-1 rounded-lg border border-slate-150 self-start sm:self-center">
                  登録数: {categories.length} カテゴリー
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* すべて表示 button */}
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                    categoryFilter === "all"
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/15"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  すべて表示
                </button>

                {/* Dynamic categories list */}
                {categories.map((catName) => {
                  const isSelected = categoryFilter === catName;
                  const styles = getCategoryStyles(catName);
                  return (
                    <div
                      key={catName}
                      className="relative flex items-center group/cat"
                    >
                      <button
                        onClick={() => setCategoryFilter(catName)}
                        className={`pl-3.5 pr-8 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? `${styles.bgColor} ${styles.color} ${styles.borderColor} ring-2 ring-blue-500/25`
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: styles.hex }} />
                        <span>{catName}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const success = await handleDeleteCategory(catName);
                          if (success && categoryFilter === catName) {
                            setCategoryFilter("all");
                          }
                        }}
                        className="absolute right-1.5 w-4 h-4 rounded-full flex items-center justify-center bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-400 transition-all text-[8px] font-bold cursor-pointer"
                        title={`${catName}カテゴリーを削除`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {/* Inline category input form at the end of the list */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem("inlineCategoryName") as HTMLInputElement;
                    const name = input.value.trim();
                    if (!name) return;
                    if (name.length > 15) {
                      setAlertMessage({ type: "error", text: "カテゴリー名は15文字以内で入力してください。" });
                      return;
                    }
                    const success = await handleAddNewCategory(name);
                    if (success) {
                      form.reset();
                    }
                  }}
                  className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 w-full sm:w-auto"
                >
                  <input
                    name="inlineCategoryName"
                    type="text"
                    maxLength={15}
                    placeholder="新しいカテゴリー名..."
                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 px-3 py-1 w-full sm:w-36 placeholder:text-slate-400 placeholder:font-semibold"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                    title="カテゴリーを追加"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* List display */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 h-48 animate-pulse flex flex-col justify-between shadow-xs">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div className="w-16 h-5 bg-slate-100 rounded-full" />
                        <div className="w-12 h-5 bg-slate-150 rounded-full" />
                      </div>
                      <div className="w-3/4 h-5 bg-slate-100 rounded-lg" />
                      <div className="w-full h-3 bg-slate-150 rounded-lg" />
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm px-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <p className="text-slate-600 text-sm font-extrabold">
                  {items.length === 0 
                    ? "登録されている指導・研修項目がありません。" 
                    : "該当する指導・研修項目が見つかりませんでした。"}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">条件を変更して絞り込むか、新しい項目を追加してください。</p>
                {items.length === 0 && (
                  <button
                    onClick={handleAddNewClick}
                    className="mt-5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                    id="zero-state-add-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>最初の項目を追加する</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div key={item.id} className="cursor-pointer" onClick={() => handleEditClick(item)}>
                    <ItemCard
                      item={item}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Adding / Editing Modal prompt */}
      <ItemModal
        isOpen={isItemModalOpen}
        item={selectedItem}
        categories={categories}
        onAddNewCategory={handleAddNewCategory}
        onDeleteCategory={handleDeleteCategory}
        onSave={handleSaveItem}
        onClose={() => setIsItemModalOpen(false)}
        onDelete={handleDeleteClick}
      />

      {/* Removing Delete Confirm Modal prompt */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        item={itemToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
}
