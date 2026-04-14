import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, HardDrive, Globe, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api/settings'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { toast } from '../components/ui/Toast'
import type { APIConfig, StorageProfile } from '../types'

// ── API Config form ───────────────────────────────────────────────────────────

const defaultApiForm = { name: '', api_key: '', base_url: '', model_name: '', provider_hint: '', notes: '' }

// ── Storage Profile form ──────────────────────────────────────────────────────

const defaultStorageForm: Omit<StorageProfile, 'id' | 'created_at'> = {
  name: '', type: 'local', local_path: null, remote_url: null, remote_token: null, notes: null,
}

export function Settings() {
  const qc = useQueryClient()

  // API Configs state
  const [apiModalOpen, setApiModalOpen] = useState(false)
  const [editApiTarget, setEditApiTarget] = useState<APIConfig | null>(null)
  const [apiForm, setApiForm] = useState(defaultApiForm)
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({})

  // Storage Profiles state
  const [storageModalOpen, setStorageModalOpen] = useState(false)
  const [editStorageTarget, setEditStorageTarget] = useState<StorageProfile | null>(null)
  const [storageForm, setStorageForm] = useState<Omit<StorageProfile, 'id' | 'created_at'>>(defaultStorageForm)

  const { data: configs = [], isLoading: apiLoading } = useQuery({
    queryKey: ['api-configs'],
    queryFn: settingsApi.list,
  })

  const { data: storageProfiles = [], isLoading: storageLoading } = useQuery({
    queryKey: ['storage-profiles'],
    queryFn: settingsApi.listStorage,
  })

  const { data: activeStorage } = useQuery({
    queryKey: ['active-storage'],
    queryFn: settingsApi.getActiveStorage,
  })

  // API Config mutations
  const saveApiMut = useMutation({
    mutationFn: async () => {
      const p = { ...apiForm, base_url: apiForm.base_url || null, model_name: apiForm.model_name || null,
                  provider_hint: apiForm.provider_hint || null, notes: apiForm.notes || null } as any
      return editApiTarget ? settingsApi.update(editApiTarget.id, p) : settingsApi.create(p)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-configs'] })
      setApiModalOpen(false)
      toast.success(editApiTarget ? '已更新' : '已添加')
    },
    onError: (e: any) => toast.error(e.message || '保存失败'),
  })

  const deleteApiMut = useMutation({
    mutationFn: settingsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-configs'] }); toast.success('已删除') },
    onError: () => toast.error('删除失败'),
  })

  // Storage Profile mutations
  const saveStorageMut = useMutation({
    mutationFn: async () => {
      const p = { ...storageForm, local_path: storageForm.local_path || null,
                  remote_url: storageForm.remote_url || null, remote_token: storageForm.remote_token || null,
                  notes: storageForm.notes || null }
      return editStorageTarget
        ? settingsApi.updateStorage(editStorageTarget.id, p)
        : settingsApi.createStorage(p)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-profiles'] })
      qc.invalidateQueries({ queryKey: ['active-storage'] })
      setStorageModalOpen(false)
      toast.success(editStorageTarget ? '已更新' : '已添加')
    },
    onError: (e: any) => toast.error(e.message || '保存失败'),
  })

  const deleteStorageMut = useMutation({
    mutationFn: settingsApi.deleteStorage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-profiles'] })
      qc.invalidateQueries({ queryKey: ['active-storage'] })
      toast.success('已删除')
    },
    onError: () => toast.error('删除失败'),
  })

  const setActiveMut = useMutation({
    mutationFn: settingsApi.setActiveStorage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-storage'] })
      toast.success('已切换存储方案')
    },
    onError: () => toast.error('切换失败'),
  })

  const openCreateApi = () => { setEditApiTarget(null); setApiForm(defaultApiForm); setApiModalOpen(true) }
  const openEditApi = (cfg: APIConfig) => {
    setEditApiTarget(cfg)
    setApiForm({ name: cfg.name, api_key: cfg.api_key, base_url: cfg.base_url || '',
                 model_name: cfg.model_name || '', provider_hint: cfg.provider_hint || '', notes: cfg.notes || '' })
    setApiModalOpen(true)
  }

  const openCreateStorage = () => { setEditStorageTarget(null); setStorageForm(defaultStorageForm); setStorageModalOpen(true) }
  const openEditStorage = (p: StorageProfile) => {
    setEditStorageTarget(p)
    setStorageForm({ name: p.name, type: p.type, local_path: p.local_path, remote_url: p.remote_url,
                     remote_token: p.remote_token, notes: p.notes })
    setStorageModalOpen(true)
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-12">

      {/* ── API 配置 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">API 配置</h2>
          <button className="btn-primary text-sm" onClick={openCreateApi}><Plus size={14} /> 添加</button>
        </div>

        {apiLoading ? (
          <div className="flex justify-center py-10"><Spinner size={24} /></div>
        ) : configs.length === 0 ? (
          <EmptyCard label="还没有 API 配置，点击「添加」" />
        ) : (
          <div className="space-y-2">
            {configs.map((cfg) => (
              <div key={cfg.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium text-text-primary text-sm">{cfg.name}</span>
                      {cfg.provider_hint && (
                        <span className="badge bg-accent/15 text-accent text-xs">{cfg.provider_hint}</span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-xs text-text-secondary">
                      <Row label="API Key">
                        <span className="font-mono">
                          {showKeys[cfg.id] ? cfg.api_key : maskKey(cfg.api_key)}
                        </span>
                        <button onClick={() => setShowKeys(k => ({ ...k, [cfg.id]: !k[cfg.id] }))}
                          className="text-text-muted hover:text-text-primary ml-1">
                          {showKeys[cfg.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </Row>
                      {cfg.model_name && <Row label="模型"><span className="font-mono">{cfg.model_name}</span></Row>}
                      {cfg.base_url && <Row label="端点"><span className="font-mono truncate">{cfg.base_url}</span></Row>}
                      {cfg.notes && <Row label="备注"><span>{cfg.notes}</span></Row>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEditApi(cfg)} className="btn-ghost py-1 px-2.5 text-xs"><Pencil size={12} /></button>
                    <button onClick={() => confirm(`删除「${cfg.name}」？`) && deleteApiMut.mutate(cfg.id)}
                      className="btn-danger py-1 px-2.5 text-xs"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 存储方案 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">存储方案</h2>
            <p className="text-xs text-text-muted mt-0.5">
              当前使用：
              {activeStorage
                ? <span className="text-accent ml-1">{activeStorage.name}</span>
                : <span className="ml-1">默认（程序目录）</span>}
            </p>
          </div>
          <button className="btn-primary text-sm" onClick={openCreateStorage}><Plus size={14} /> 添加</button>
        </div>

        {storageLoading ? (
          <div className="flex justify-center py-10"><Spinner size={24} /></div>
        ) : storageProfiles.length === 0 ? (
          <EmptyCard label="还没有存储方案，使用默认本地存储" />
        ) : (
          <div className="space-y-2">
            {storageProfiles.map((p) => {
              const isActive = activeStorage?.id === p.id
              return (
                <div key={p.id}
                  className={`card p-4 transition-colors ${isActive ? 'border-accent/50 ring-1 ring-accent/20' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {p.type === 'local'
                          ? <HardDrive size={14} className="text-text-muted flex-shrink-0" />
                          : <Globe size={14} className="text-text-muted flex-shrink-0" />}
                        <span className="font-medium text-text-primary text-sm">{p.name}</span>
                        <span className={`badge text-xs ${p.type === 'local' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'}`}>
                          {p.type === 'local' ? '本地' : '远程'}
                        </span>
                        {isActive && (
                          <span className="badge bg-accent/15 text-accent text-xs flex items-center gap-1">
                            <Check size={10} /> 使用中
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 text-xs text-text-secondary">
                        {p.local_path && <Row label="路径"><span className="font-mono truncate">{p.local_path}</span></Row>}
                        {p.remote_url && <Row label="URL"><span className="font-mono truncate">{p.remote_url}</span></Row>}
                        {p.notes && <Row label="备注"><span>{p.notes}</span></Row>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!isActive && (
                        <button onClick={() => setActiveMut.mutate(p.id)}
                          className="btn-ghost py-1 px-2.5 text-xs text-accent border-accent/30 hover:bg-accent/10">
                          启用
                        </button>
                      )}
                      <button onClick={() => openEditStorage(p)} className="btn-ghost py-1 px-2.5 text-xs"><Pencil size={12} /></button>
                      <button onClick={() => confirm(`删除方案「${p.name}」？`) && deleteStorageMut.mutate(p.id)}
                        className="btn-danger py-1 px-2.5 text-xs"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* API Config Modal */}
      <Modal open={apiModalOpen} onClose={() => setApiModalOpen(false)}
        title={editApiTarget ? '编辑 API 配置' : '添加 API 配置'} width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">显示名称 *</label>
              <input className="input text-sm" placeholder="如：我的 DALL-E"
                value={apiForm.name} onChange={(e) => setApiForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">供应商备注</label>
              <input className="input text-sm" placeholder="openai / meshy / stability"
                value={apiForm.provider_hint} onChange={(e) => setApiForm(f => ({ ...f, provider_hint: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">API Key *</label>
            <input className="input text-sm font-mono" type="password" placeholder="sk-..."
              value={apiForm.api_key} onChange={(e) => setApiForm(f => ({ ...f, api_key: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Base URL（可选）</label>
              <input className="input text-sm" placeholder="https://api.openai.com"
                value={apiForm.base_url} onChange={(e) => setApiForm(f => ({ ...f, base_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">模型名称（可选）</label>
              <input className="input text-sm" placeholder="dall-e-3"
                value={apiForm.model_name} onChange={(e) => setApiForm(f => ({ ...f, model_name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">备注</label>
            <input className="input text-sm" placeholder="备注，便于区分"
              value={apiForm.notes} onChange={(e) => setApiForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button className="btn-primary flex-1" onClick={() => saveApiMut.mutate()}
              disabled={saveApiMut.isPending || !apiForm.name || !apiForm.api_key}>
              {saveApiMut.isPending ? <><Spinner size={14} /> 保存中…</> : '保存'}
            </button>
            <button className="btn-ghost" onClick={() => setApiModalOpen(false)}>取消</button>
          </div>
        </div>
      </Modal>

      {/* Storage Profile Modal */}
      <Modal open={storageModalOpen} onClose={() => setStorageModalOpen(false)}
        title={editStorageTarget ? '编辑存储方案' : '添加存储方案'} width="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="label">方案名称 *</label>
            <input className="input text-sm" placeholder="如：本地 D 盘、Cloudflare R2"
              value={storageForm.name} onChange={(e) => setStorageForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="label">存储类型</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStorageForm(f => ({ ...f, type: 'local' }))}
                className={`btn flex-1 text-sm gap-2 ${storageForm.type === 'local' ? 'btn-primary' : 'btn-ghost'}`}>
                <HardDrive size={14} /> 本地文件夹
              </button>
              <button
                onClick={() => setStorageForm(f => ({ ...f, type: 'remote' }))}
                className={`btn flex-1 text-sm gap-2 ${storageForm.type === 'remote' ? 'btn-primary' : 'btn-ghost'}`}>
                <Globe size={14} /> 线上服务器
              </button>
            </div>
          </div>

          {storageForm.type === 'local' ? (
            <div>
              <label className="label">本地路径</label>
              <input className="input text-sm font-mono" placeholder="留空则使用默认路径（程序目录）"
                value={storageForm.local_path ?? ''}
                onChange={(e) => setStorageForm(f => ({ ...f, local_path: e.target.value || null }))} />
              <p className="text-xs text-text-muted mt-1">例如：D:\GameAssets</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">上传端点 URL *</label>
                <input className="input text-sm font-mono" placeholder="https://your-server.com/upload"
                  value={storageForm.remote_url ?? ''}
                  onChange={(e) => setStorageForm(f => ({ ...f, remote_url: e.target.value || null }))} />
                <p className="text-xs text-text-muted mt-1">接受 multipart POST，响应返回 {`{"url":"..."}`}</p>
              </div>
              <div>
                <label className="label">认证 Token（可选）</label>
                <input className="input text-sm font-mono" type="password" placeholder="Bearer token"
                  value={storageForm.remote_token ?? ''}
                  onChange={(e) => setStorageForm(f => ({ ...f, remote_token: e.target.value || null }))} />
              </div>
            </div>
          )}

          <div>
            <label className="label">备注</label>
            <input className="input text-sm" placeholder="备注信息"
              value={storageForm.notes ?? ''}
              onChange={(e) => setStorageForm(f => ({ ...f, notes: e.target.value || null }))} />
          </div>

          <div className="flex gap-3 pt-1">
            <button className="btn-primary flex-1" onClick={() => saveStorageMut.mutate()}
              disabled={saveStorageMut.isPending || !storageForm.name}>
              {saveStorageMut.isPending ? <><Spinner size={14} /> 保存中…</> : '保存'}
            </button>
            <button className="btn-ghost" onClick={() => setStorageModalOpen(false)}>取消</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted w-14 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">{children}</div>
    </div>
  )
}

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="card p-10 flex flex-col items-center gap-3 text-text-muted">
      <Plus size={22} className="opacity-20" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function maskKey(key: string) {
  if (key.length <= 8) return '••••••••'
  return key.slice(0, 4) + '••••••••' + key.slice(-4)
}
