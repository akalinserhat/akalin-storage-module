/**
 * @akalin/file_manager_module - Buluta Yükleme ve RAG Ajanı Akış Takip Ekranı (CloudRagProcessTrackerModal.tsx)
 * 
 * Dosya içeri aktarılırken veya buluta yüklenirken gerçekleşen tüm teknik adımları
 * canlı ve şeffaf bir şekilde kullanıcıya sunan görselleştirme modali.
 * 
 * Pipeline Adımları:
 * 1. Yerel Dosya & SHA-256 Hash Doğrulama
 * 2. Bulut Sağlayıcıya Aktarım (Google Drive / OneDrive)
 * 3. Belge Metni & Sayfa Ayrıştırma (DocumentTextExtractor)
 * 4. RAG-CHUNK-UZMANI Ajanı ile Chunk İndekslerinin Belirlenmesi (AdminUI - gpt-4o)
 * 5. RAG-VEKTOR-UZMANI Ajanı ile Vektör Embedding Hesaplanması (ThinkPort - bge-m3:latest)
 * 6. PostgreSQL (pgvector) Depolama & İndeksleme
 * 7. Tamamlandı & AI Asistanı İçin Hazır
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud,
  Upload,
  ShieldCheck,
  FileText,
  Bot,
  Brain,
  Database,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Layers,
  FileCheck,
  Cpu,
  RefreshCw,
  X,
} from 'lucide-react';
import { BasePopup, BaseButton } from '@akalin/ui';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { RagDocumentStatusDTO } from '../types';

export interface CloudRagProcessTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId?: number;
  fileName: string;
  fileSize?: number;
  provider?: string;
  belgeTuru?: string;
  /** Yükleme anındaki yerel ilerleme durumu (örneğin HTTP byte transferi) */
  localUploadProgress?: number;
  /** Yükleme bitti mi veya dosya zaten bulutta kayıtlı mı? */
  isUploadedToCloud?: boolean;
  /** İşlem bittiğinde otomatik çağrılacak callback */
  onCompleted?: (status: RagDocumentStatusDTO) => void;
}

export type PipelineStageKey =
  | 'hash_check'
  | 'cloud_upload'
  | 'extracting'
  | 'chunking_agent'
  | 'embedding'
  | 'saving'
  | 'indexed'
  | 'failed';

interface LogEntry {
  id: string;
  time: string;
  stage: PipelineStageKey;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const CloudRagProcessTrackerModal: React.FC<CloudRagProcessTrackerModalProps> = ({
  isOpen,
  onClose,
  fileId,
  fileName,
  fileSize = 0,
  provider = 'google',
  belgeTuru = 'Genel',
  localUploadProgress = 100,
  isUploadedToCloud = false,
  onCompleted,
}) => {
  const { t } = useTranslation();
  const { adapter } = useStorageModule();

  const [activeStage, setActiveStage] = useState<PipelineStageKey>('hash_check');
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [stageDetail, setStageDetail] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [chunkingModel, setChunkingModel] = useState<string>('gpt-4o');
  const [chunkingAgentKod, setChunkingAgentKod] = useState<string>('RAG-CHUNK-UZMANI');
  const [vectorModel, setVectorModel] = useState<string>('bge-m3:latest');
  const [vectorAgentKod, setVectorAgentKod] = useState<string>('RAG-VEKTOR-UZMANI');
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showLogDetails, setShowLogDetails] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pollIntervalRef = useRef<any>(null);
  const completedRef = useRef<boolean>(false);

  const addLog = useCallback(
    (stage: PipelineStageKey, text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      setLogs((prev) => {
        // Son log aynı metne sahipse mükerrer ekleme
        if (prev.length > 0 && prev[prev.length - 1].text === text) return prev;
        return [
          ...prev,
          {
            id: `${Date.now()}_${Math.random()}`,
            time: timeStr,
            stage,
            text,
            type,
          },
        ];
      });
    },
    []
  );

  // Modal ilk açıldığında veya dosya değiştiğinde başlangıç adımlarını tetikle
  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    completedRef.current = false;
    setIsFinished(false);
    setHasError(false);
    setErrorMessage('');
    setLogs([]);

    addLog(
      'hash_check',
      t(
        'CloudRagTracker_logHashChecked',
        'Dosya bütünlüğü doğrulandı ve SHA-256 içerik özeti hesaplandı.'
      ),
      'info'
    );

    if (isUploadedToCloud) {
      setActiveStage('extracting');
      setOverallProgress(25);
      addLog(
        'cloud_upload',
        t(
          'CloudRagTracker_logCloudUploadDone',
          'Dosya bulut sağlayıcısına ({{provider}}) başarıyla aktarıldı ve bulut kaydı oluşturuldu.',
          { provider: provider.toUpperCase() }
        ),
        'success'
      );
    } else {
      setActiveStage('cloud_upload');
      setOverallProgress(Math.max(10, Math.min(25, Math.round(localUploadProgress * 0.25))));
      addLog(
        'cloud_upload',
        t(
          'CloudRagTracker_logCloudUploading',
          'Dosya bulut sağlayıcısına aktarılıyor...'
        ),
        'info'
      );
    }
  }, [isOpen, fileId, isUploadedToCloud, localUploadProgress, provider, addLog, t]);

  // Bulut transfer ilerlemesini yansıt
  useEffect(() => {
    if (!isUploadedToCloud && localUploadProgress > 0 && localUploadProgress < 100) {
      setOverallProgress(Math.max(5, Math.min(25, Math.round(localUploadProgress * 0.25))));
    } else if (isUploadedToCloud && activeStage === 'cloud_upload') {
      setActiveStage('extracting');
      setOverallProgress(28);
      addLog(
        'cloud_upload',
        t(
          'CloudRagTracker_logCloudUploadDone',
          'Dosya bulut sağlayıcısına ({{provider}}) başarıyla aktarıldı ve bulut kaydı oluşturuldu.',
          { provider: provider.toUpperCase() }
        ),
        'success'
      );
    }
  }, [localUploadProgress, isUploadedToCloud, activeStage, provider, addLog, t]);

  // Durum sorgulama (polling) mekanizması
  useEffect(() => {
    if (!isOpen || !fileId || completedRef.current) return;

    const pollStatus = async () => {
      try {
        if (!adapter.getFileRagStatus) return;
        const res: RagDocumentStatusDTO = await adapter.getFileRagStatus(fileId);

        if (!res) return;

        if (res.pageCount && res.pageCount > 0) setPageCount(res.pageCount);
        if (res.totalChunks && res.totalChunks > 0) setTotalChunks(res.totalChunks);
        if (res.chunkingModel) setChunkingModel(res.chunkingModel);
        if (res.chunkingAgentKod) setChunkingAgentKod(res.chunkingAgentKod);
        if (res.statusDetail) setStageDetail(res.statusDetail);

        const stage = (res.indexingStage || res.status || '').toLowerCase();

        if (stage === 'extracting') {
          setActiveStage('extracting');
          setOverallProgress(Math.max(25, res.indexingProgress || 28));
          addLog(
            'extracting',
            res.statusDetail ||
              t(
                'CloudRagTracker_logExtracting',
                'Belge metni ve sayfaları ayrıştırılıyor...'
              ),
            'info'
          );
        } else if (stage === 'chunking_agent' || stage === 'chunking_fallback') {
          setActiveStage('chunking_agent');
          setOverallProgress(Math.max(35, res.indexingProgress || 45));
          addLog(
            'chunking_agent',
            res.statusDetail ||
              t(
                'CloudRagTracker_logChunkingAgent',
                'RAG-CHUNK-UZMANI ajanı belge bölüm sınırlarını analiz ediyor...'
              ),
            'info'
          );
        } else if (stage === 'embedding') {
          setActiveStage('embedding');
          setOverallProgress(Math.max(60, res.indexingProgress || 70));
          addLog(
            'embedding',
            res.statusDetail ||
              t(
                'CloudRagTracker_logEmbedding',
                'RAG-VEKTOR-UZMANI ajanı vektör embedding hesaplıyor...'
              ),
            'info'
          );
        } else if (stage === 'saving') {
          setActiveStage('saving');
          setOverallProgress(Math.max(90, res.indexingProgress || 94));
          addLog(
            'saving',
            res.statusDetail ||
              t(
                'CloudRagTracker_logSaving',
                'Vektör parçaları PostgreSQL (pgvector) RAG veritabanına yazılıyor...'
              ),
            'info'
          );
        } else if (stage === 'indexed' || res.status === 'indexed') {
          setActiveStage('indexed');
          setOverallProgress(100);
          setIsFinished(true);
          completedRef.current = true;
          addLog(
            'indexed',
            t(
              'CloudRagTracker_logIndexedSuccess',
              'PostgreSQL (pgvector) RAG indekslemesi başarıyla tamamlandı. Belge AI aramaları için hazır!'
            ),
            'success'
          );

          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          if (onCompleted) {
            onCompleted(res);
          }
        } else if (stage === 'failed' || res.status === 'failed') {
          setActiveStage('failed');
          setHasError(true);
          setErrorMessage(
            res.statusDetail ||
              t('CloudRagTracker_errorGeneric', 'İndeksleme işlemi sırasında bir hata oluştu.')
          );
          addLog('failed', res.statusDetail || 'İşlem başarısız oldu.', 'error');

          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (stage === 'unsupported' || res.status === 'unsupported') {
          // Doğrudan okunan dosya türü (RAG gerektirmez)
          setActiveStage('indexed');
          setOverallProgress(100);
          setIsFinished(true);
          completedRef.current = true;
          addLog(
            'indexed',
            t(
              'CloudRagTracker_logUnsupportedSuccess',
              'Bu dosya türü doğrudan okunabilmektedir; buluta yükleme başarıyla tamamlandı.'
            ),
            'success'
          );
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err: any) {
        // Polling anlık ağ hatalarını yutarak tekrar dener
      }
    };

    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, 950);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, fileId, adapter, addLog, onCompleted, t]);

  // Adımların aktif / tamamlandı durumlarını belirleyen yardımcılar
  const getStepStatus = (stepKey: PipelineStageKey): 'pending' | 'active' | 'completed' | 'error' => {
    if (hasError && activeStage === stepKey) return 'error';
    if (activeStage === 'indexed') return 'completed';

    const order: PipelineStageKey[] = [
      'hash_check',
      'cloud_upload',
      'extracting',
      'chunking_agent',
      'embedding',
      'saving',
      'indexed',
    ];

    const activeIndex = order.indexOf(activeStage);
    const stepIndex = order.indexOf(stepKey);

    if (activeIndex > stepIndex) return 'completed';
    if (activeIndex === stepIndex) return 'active';
    return 'pending';
  };

  const steps = [
    {
      key: 'hash_check' as PipelineStageKey,
      title: t('CloudRagTracker_step1Title', 'Bütünlük & SHA-256 Hash Kontrolü'),
      desc: t('CloudRagTracker_step1Desc', 'Dosya bütünlüğü doğrulandı ve SHA-256 özeti oluşturuldu.'),
      icon: ShieldCheck,
      badge: t('CloudRagTracker_badgeLocal', 'Yerel'),
    },
    {
      key: 'cloud_upload' as PipelineStageKey,
      title: t('CloudRagTracker_step2Title', 'Bulut Depolama Aktarımı'),
      desc: t(
        'CloudRagTracker_step2Desc',
        'Dosya {{provider}} bulut sürücüsüne yüklendi ve sistem bulut kimliği oluşturuldu.',
        { provider: provider.toUpperCase() }
      ),
      icon: Cloud,
      badge: provider.toUpperCase(),
    },
    {
      key: 'extracting' as PipelineStageKey,
      title: t('CloudRagTracker_step3Title', 'Belge Metni & Sayfa Ayrıştırma'),
      desc: t(
        'CloudRagTracker_step3Desc',
        'Belge yapısı (PDF/Word/Excel) analiz edilip sayfa ve satır metinleri ayrıştırılıyor.'
      ),
      icon: FileText,
      badge: 'Parser',
    },
    {
      key: 'chunking_agent' as PipelineStageKey,
      title: t('CloudRagTracker_step4Title', 'RAG Chunk Uzmanı Ajanı Analizi'),
      desc: t(
        'CloudRagTracker_step4Desc',
        'Ajan belge pencerelerini analiz ederek tablo ve bölüm sınır indekslerini belirliyor.'
      ),
      icon: Bot,
      badge: `${chunkingAgentKod} (${chunkingModel})`,
      agentHighlight: true,
    },
    {
      key: 'embedding' as PipelineStageKey,
      title: t('CloudRagTracker_step5Title', 'RAG Vektör Uzmanı & Embedding'),
      desc: t(
        'CloudRagTracker_step5Desc',
        'Bölüm parçaları için 1024 boyutlu çok dilli vektör embedding hesaplaması yapılıyor.'
      ),
      icon: Brain,
      badge: `${vectorAgentKod} (${vectorModel})`,
      vectorHighlight: true,
    },
    {
      key: 'saving' as PipelineStageKey,
      title: t('CloudRagTracker_step6Title', 'PostgreSQL (pgvector) Depolama'),
      desc: t(
        'CloudRagTracker_step6Desc',
        'Vektörler ve anlamsal parçalar pgvector veritabanına indeksleniyor.'
      ),
      icon: Database,
      badge: 'pgvector HNSW',
    },
  ];

  return (
    <BasePopup
      isOpen={isOpen}
      onClose={onClose}
      title={t('CloudRagTracker_modalTitle', 'Bulut Depolama & RAG Yapay Zeka Aktarım Merkezi')}
      size="xl"
    >
      <div className="flex flex-col gap-5 p-2 sm:p-4 text-foreground">
        {/* Üst Bilgi Başlığı */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Layers size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="font-semibold text-base flex items-center gap-2">
                <span>{fileName}</span>
                {belgeTuru && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                    {belgeTuru}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                {fileSize > 0 && <span>{(fileSize / 1024).toFixed(1)} KB</span>}
                <span>•</span>
                <span className="uppercase">{provider}</span>
                {pageCount > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      {t('CloudRagTracker_pagesCount', '{{count}} Sayfa', { count: pageCount })}
                    </span>
                  </>
                )}
                {totalChunks > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      {t('CloudRagTracker_chunksCount', '{{count}} Parça', { count: totalChunks })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Durum Rozeti */}
          <div className="flex items-center gap-2">
            {isFinished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
                <CheckCircle2 size={15} />
                {t('CloudRagTracker_statusReady', 'AI İçin Hazır')}
              </span>
            ) : hasError ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
                <AlertCircle size={15} />
                {t('CloudRagTracker_statusFailed', 'İşlem Başarısız')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 animate-pulse">
                <Loader2 size={15} className="animate-spin" />
                {t('CloudRagTracker_statusProcessing', 'Ajanlar İşliyor...')}
              </span>
            )}
          </div>
        </div>

        {/* Ana İlerleme Çubuğu */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-foreground/80 flex items-center gap-1.5">
              {stageDetail ||
                (isFinished
                  ? t('CloudRagTracker_detailDone', 'RAG indeksleme başarıyla tamamlandı.')
                  : t('CloudRagTracker_detailOngoing', 'İşlem yürütülüyor...'))}
            </span>
            <span className="font-semibold text-primary">{overallProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border/50">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                hasError
                  ? 'bg-destructive'
                  : isFinished
                  ? 'bg-success'
                  : 'bg-gradient-to-r from-primary via-indigo-500 to-sky-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Görsel Pipeline Akış Kartları (Stepper) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((st, idx) => {
            const status = getStepStatus(st.key);
            const Icon = st.icon;

            const isCurrentActive = status === 'active';
            const isDone = status === 'completed';
            const isErr = status === 'error';

            return (
              <div
                key={st.key}
                className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                  isDone
                    ? 'bg-success/5 border-success/30 shadow-xs'
                    : isCurrentActive
                    ? 'bg-primary/10 border-primary ring-1 ring-primary/40 shadow-sm'
                    : isErr
                    ? 'bg-destructive/10 border-destructive/40 shadow-xs'
                    : 'bg-card/50 border-border/60 opacity-65'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isDone
                            ? 'bg-success/20 text-success'
                            : isCurrentActive
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : isErr
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} />
                        ) : isCurrentActive ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : isErr ? (
                          <AlertCircle size={16} />
                        ) : (
                          <Icon size={16} />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        0{idx + 1}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium truncate max-w-[150px] ${
                        st.agentHighlight
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                          : st.vectorHighlight
                          ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {st.badge}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold leading-tight mb-1 text-foreground">
                    {st.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {st.desc}
                  </p>
                </div>

                {/* Alt Durum İndikatörü */}
                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-muted-foreground">
                    {t('CloudRagTracker_lblStatus', 'Durum')}:
                  </span>
                  <span
                    className={`font-semibold ${
                      isDone
                        ? 'text-success'
                        : isCurrentActive
                        ? 'text-primary animate-pulse'
                        : isErr
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {isDone
                      ? t('CloudRagTracker_stepDone', 'Tamamlandı')
                      : isCurrentActive
                      ? t('CloudRagTracker_stepWorking', 'Yürütülüyor...')
                      : isErr
                      ? t('CloudRagTracker_stepFailed', 'Hata')
                      : t('CloudRagTracker_stepWaiting', 'Bekliyor')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Başarı Özeti Kartı */}
        {isFinished && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-success/15 via-emerald-500/10 to-teal-500/15 border border-success/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success text-success-foreground flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {t('CloudRagTracker_successTitle', 'Belge Başarıyla İndekslendi & Hazır!')}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    'CloudRagTracker_successDesc',
                    'Belge artık Webakus Yapay Zeka Ajanları tarafından semantik olarak aranabilir ve cevaplarda kaynak olarak referans verilebilir.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border/80 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">
                  {t('CloudRagTracker_statChunks', 'Parça (Chunk)')}
                </div>
                <div className="font-bold text-foreground text-sm">{totalChunks || '-'}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border/80 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">
                  {t('CloudRagTracker_statPages', 'Sayfa')}
                </div>
                <div className="font-bold text-foreground text-sm">{pageCount || 1}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-card border border-border/80 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">
                  {t('CloudRagTracker_statModel', 'Vektör Boyutu')}
                </div>
                <div className="font-bold text-foreground text-sm">1024 Boyut</div>
              </div>
            </div>
          </div>
        )}

        {/* Hata Durum Kartı */}
        {hasError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-destructive">
                {t('CloudRagTracker_errorTitle', 'İndeksleme Tamamlanamadı')}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Katlanabilir Canlı Terminal / İşlem Günlüğü */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => setShowLogDetails((prev) => !prev)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-muted-foreground" />
              <span>{t('CloudRagTracker_btnLogs', 'Canlı İşlem Günlüğü & Ajan İletişimi')}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-normal">
                {logs.length} {t('CloudRagTracker_lblEntries', 'kayıt')}
              </span>
            </div>
            {showLogDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showLogDetails && (
            <div className="p-3 bg-zinc-950 text-zinc-100 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5 border-t border-border/50">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-zinc-500 shrink-0 select-none">[{log.time}]</span>
                  <span
                    className={`font-semibold shrink-0 select-none ${
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'warning'
                        ? 'text-amber-400'
                        : 'text-sky-400'
                    }`}
                  >
                    [{log.stage.toUpperCase()}]
                  </span>
                  <span className="text-zinc-300 break-all">{log.text}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-zinc-500 italic">
                  {t('CloudRagTracker_noLogsYet', 'Kayıt bekleniyor...')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alt Butonlar */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <BaseButton
            variant={isFinished ? 'primary' : 'outline'}
            onClick={onClose}
            className="text-xs px-4"
          >
            {isFinished
              ? t('CloudRagTracker_btnCloseDone', 'Tamamla & Kapat')
              : t('CloudRagTracker_btnClose', 'Kapat')}
          </BaseButton>
        </div>
      </div>
    </BasePopup>
  );
};

export default CloudRagProcessTrackerModal;
