import React, { useEffect, useState } from 'react';
import { Input, List, Button, Spin, message, Alert, Space } from 'antd';
import { useNavigate } from 'react-router-dom';

// 判断是否是 Electron 环境
const isElectron = () => {
  return (
    typeof window !== 'undefined' &&
    !!window.api &&
    typeof window.api.downloadVenueData === 'function' &&
    typeof window.api.setConfig === 'function'
  );
};

/**
 * 选择场馆页面 —— 只在下载完成后通过 props 通知父组件“可以进入离线页面”
 * 不负责页面跳转，只调用 onDownloaded(venueId)
 */
const SelectVenuePage = ({ onDownloaded, isOnline = true }) => {
  const [venues, setVenues] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  const BASE_URL =  'https://apis.platypus360.com';

  // 页面加载时拉取场馆列表
  useEffect(() => {
    if (!isOnline) {
      console.log('[SelectVenuePage] Offline detected, skipping venue list fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${BASE_URL}/ts/get-all-venues`)
      .then(async res => {
        const text = await res.text();
        if (text.startsWith('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('Received HTML instead of JSON');
        }
        return JSON.parse(text);
      })
      .then(data => {
        setVenues(data);
        setFiltered(data);
      })
      .catch(err => {
        console.error('Failed to fetch venue list:', err);
        message.error('Failed to fetch venue list');
      })
      .finally(() => setLoading(false));
  }, [BASE_URL, isOnline]);

  // 搜索过滤
  const onSearch = term => {
    const key = term.toLowerCase();
    setFiltered(
      venues.filter(v =>
        v.name.toLowerCase().includes(key) ||
        (v.alias && v.alias.toLowerCase().includes(key))
      )
    );
  };

  // 桌面离线版：下载并配置，完成后通知父组件进入 offline 页面
  const handleDownload = async venue => {
    if (!isElectron()) {
      setShowWarning(true);
      return;
    }

    if (!isOnline) {
      message.warning('`Cannot download while offline. Please connect to the internet and try again.');
      return;
    }

    setLoading(true);
    setSelectedVenue(venue.id);

    try {
      console.log('[SelectVenuePage] Starting download for venue:', venue.id);
      // 1. 下载离线数据
      await window.api.downloadVenueData(venue.id);
      // 2. 保存 venueId 到 config 和本地存储
      await window.api.setConfig(venue.id);
      localStorage.setItem('selectedVenueId', venue.id);

      message.success('Download complete. Venue saved.');
      // 3. 通知 App 可以跳转到 OfflineTouchscreenPage
      if (typeof onDownloaded === 'function') {
        onDownloaded(venue.id);
      }
    } catch (err) {
      console.error('Failed to download or save configuration:', err);
      message.error('Failed to download or save configuration');
    } finally {
      setLoading(false);
    }
  };

  // 线上版：直接进入（如需）
  const handleEnter = venue => {
    navigate(`/venue/?venue_id=${venue.id}`);
  };
  console.log('[SelectVenuePage] rendered');


  return (
    <div style={{ padding: '3rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Choose Your Venue</h2>

      {!isOnline && (
        <Alert
          banner
          showIcon
          type="info"
          message="`You are currently offline. Please connect to the internet to select and download venue data.`"
          style={{ marginBottom: 24 }}
        />
      )}

      <Input.Search
        placeholder="Search venues"
        onSearch={onSearch}
        allowClear
        size="large"
        style={{ marginBottom: '2rem', fontSize: '1.25rem' }}
      />

      {showWarning && (
        <Alert
          banner
          showIcon
          type="warning"
          message="Please use the desktop app to download offline data."
          style={{ marginBottom: 24 }}
        />
      )}

      {loading && (
        <Spin
          tip={<span style={{ fontSize: '1.25rem' }}>Downloading {selectedVenue}…</span>}
          style={{ marginBottom: '2rem' }}
        />
      )}
      <List
        bordered
        dataSource={filtered}
        renderItem={venue => (
          <List.Item
            style={{ padding: '1rem', fontSize: '1.5rem' }}
            actions={[
              <Space key="actions">
                {!isElectron() && (
                  <Button
                    size="large"
                    style={{ width: 160 }}
                    onClick={() => handleEnter(venue)}
                  >
                    Enter
                  </Button>)}
                {isElectron() && (
                  <Button
                    size="normal"
                    type="primary"
                    style={{ width: 160 }}
                    onClick={() => handleDownload(venue)}
                    loading={loading && selectedVenue === venue.id}
                  >
                    Download
                  </Button>
                )}
              </Space>
            ]}
          >
            <div>
              {venue.name}
              {venue.alias && ` (${venue.alias})`}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default SelectVenuePage;
