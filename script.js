document.addEventListener('DOMContentLoaded', function() {
    // 分页功能
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const page1 = document.querySelector('.album-page[data-page="1"]');
    const page2 = document.querySelector('.album-page[data-page="2"]');
    const page3 = document.querySelector('.album-page[data-page="3"]');
    const pageNum1 = document.querySelector('.page-number:nth-child(1)');
    const pageNum2 = document.querySelector('.page-number:nth-child(2)');
    const pageNum3 = document.querySelector('.page-number:nth-child(3)');
    let currentPage = 1;

    function showPage(pageNum) {
        // 隐藏所有页面
        [page1, page2, page3].forEach(page => page.style.display = 'none');
        
        // 移除所有页码的active类
        [pageNum1, pageNum2, pageNum3].forEach(num => num.classList.remove('active'));
        
        // 显示选中的页面
        const pages = [page1, page2, page3];
        const pageNums = [pageNum1, pageNum2, pageNum3];
        
        pages[pageNum - 1].style.display = 'block';
        pageNums[pageNum - 1].classList.add('active');
        
        // 更新按钮状态
        prevBtn.disabled = pageNum === 1;
        nextBtn.disabled = pageNum === 3;
        
        currentPage = pageNum;
    }

    // 初始化显示第一页
    showPage(1);

    // 添加按钮点击事件
    nextBtn.onclick = function() {
        if (currentPage < 3) {
            showPage(currentPage + 1);
        }
    };

    prevBtn.onclick = function() {
        if (currentPage > 1) {
            showPage(currentPage - 1);
        }
    };

    // 添加页码点击事件
    pageNum1.onclick = function() { showPage(1); };
    pageNum2.onclick = function() { showPage(2); };
    pageNum3.onclick = function() { showPage(3); };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker 注册成功:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker 注册失败:', error);
            });
    }

    const albumImages = document.querySelectorAll('.album-img');
    const progressBar = document.querySelector('.progress-bar');
    const progress = document.querySelector('.progress');
    const progressHandle = document.querySelector('.progress-handle');
    const currentTimeSpan = document.querySelector('.current-time');
    const totalTimeSpan = document.querySelector('.total-time');
    const bottomCover = document.getElementById('bottom-cover');
    const bottomTitle = document.getElementById('bottom-title');
    const audioElements = document.querySelectorAll('.album-audio');
    let currentAudio = null;
    let isDragging = false;
    const lyricsBtn = document.querySelector('.lyrics-btn button');
    const lyricsPage = document.querySelector('.lyrics-page');
    const backBtn = document.querySelector('.back-btn');

    // 为所有音频元素添加事件监听
    audioElements.forEach(addAudioEventListeners);

    // 处理音频播放的函数
    function handleAudioPlay(audio) {
        if (currentAudio && currentAudio !== audio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        currentAudio = audio;

        const albumDiv = audio.closest('.album');
        const albumImg = albumDiv.querySelector('.album-img');
        const albumTitle = albumDiv.querySelector('h3').textContent;

        bottomCover.src = albumImg.src;
        bottomTitle.textContent = albumTitle;
        document.getElementById('lyrics-cover').src = albumImg.src;

        const songName = audio.id.replace('audio-', '');
        loadLyrics(songName).then(lyrics => {
            if (lyrics && lyrics.length > 0) {
                audio.dataset.lyrics = JSON.stringify(lyrics);
                updateLyricsDisplay(lyrics);
            }
        }).catch(error => {
            console.error('加载歌词失败:', error);
        });

        updateProgress(audio);
    }

    // 格式化时间显示
    function formatTime(seconds) {
        if (!seconds) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // 进度条点击事件
    progressBar.addEventListener('click', (e) => {
        if (!currentAudio) return;
        const rect = progressBar.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        currentAudio.currentTime = currentAudio.duration * percentage;
        progress.style.width = `${percentage * 100}%`;
        currentTimeSpan.textContent = formatTime(currentAudio.currentTime);
    });

    // 专辑图片点击事件
    albumImages.forEach(img => {
        img.addEventListener('click', function() {
            const audio = this.parentElement.querySelector('audio');
            if (currentAudio === audio) {
                if (audio.paused) {
                    audio.play();
                } else {
                    audio.pause();
                }
            } else {
                if (currentAudio) {
                    currentAudio.pause();
                }
                audio.play();
            }
        });
    });

    // 展开歌词按钮点击事件
    lyricsBtn.addEventListener('click', function() {
        lyricsPage.classList.add('show');
    });

    // 返回按钮点击事件
    backBtn.addEventListener('click', function() {
        lyricsPage.classList.remove('show');
    });

    // 加载歌词文件
    async function loadLyrics(songName) {
        try {
            const response = await fetch(`lrc/${songName}.lrc`);
            if (!response.ok) {
                throw new Error(`Failed to load lyrics for ${songName}`);
            }
            const text = await response.text();
            return parseLRC(text);
        } catch (error) {
            console.error('加载歌词失败:', error);
            return [];
        }
    }

    // 解析LRC格式歌词
    function parseLRC(lrc) {
        const lines = lrc.split('\n');
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
        const lyrics = [];

        lines.forEach(line => {
            const match = timeRegex.exec(line);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3]);
                const time = minutes * 60 + seconds + milliseconds / 1000;
                const text = line.replace(timeRegex, '').trim();
                if (text) {
                    lyrics.push({ time, text });
                }
            }
        });

        return lyrics.sort((a, b) => a.time - b.time);
    }

    // 更新歌词显示
    function updateLyricsDisplay(lyrics) {
        const lyricsContainer = document.querySelector('.lyrics-content');
        if (!lyricsContainer || !lyrics) return;

        lyricsContainer.innerHTML = lyrics.map(lyric => 
            `<p>${lyric.text}</p>`
        ).join('');
    }

    // 更新当前播放的歌词
    function updateCurrentLyric(currentTime, lyrics) {
        if (!lyrics || !lyrics.length) return;

        const lyricsContainer = document.querySelector('.lyrics-content');
        if (!lyricsContainer) return;

        const currentIndex = lyrics.findIndex((lyric, index) => {
            const nextLyric = lyrics[index + 1];
            return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
        });

        const allLines = lyricsContainer.querySelectorAll('p');
        allLines.forEach(line => line.classList.remove('active'));

        if (currentIndex !== -1) {
            const currentLine = allLines[currentIndex];
            if (currentLine) {
                currentLine.classList.add('active');
                currentLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // 重置所有其他音频
    function resetOtherAudios(currentAudio) {
        audioElements.forEach(audio => {
            if (audio !== currentAudio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }

    // 更新媒体会话信息
    function updateMediaSession(audio) {
        if ('mediaSession' in navigator) {
            const albumDiv = audio.closest('.album');
            const albumImg = albumDiv.querySelector('.album-img');
            const albumTitle = albumDiv.querySelector('h3').textContent;

            navigator.mediaSession.metadata = new MediaMetadata({
                title: albumTitle,
                artwork: [{ src: albumImg.src }]
            });
        }
    }

    // 更新底部状态栏
    function updateBottomBar(audio) {
        const albumDiv = audio.closest('.album');
        const albumImg = albumDiv.querySelector('.album-img');
        const albumTitle = albumDiv.querySelector('h3').textContent;

        bottomCover.src = albumImg.src;
        bottomTitle.textContent = albumTitle;
        updateProgress(audio);
    }

    // 更新进度条和时间显示
    function updateProgress(audio) {
        if (!audio) return;

        const progressPercentage = (audio.currentTime / audio.duration) * 100;
        if (audio === currentAudio) {
            progress.style.width = `${progressPercentage}%`;
            currentTimeSpan.textContent = formatTime(audio.currentTime);
            totalTimeSpan.textContent = formatTime(audio.duration);
        }
    }

    // 添加音频播放事件监听
    function addAudioEventListeners(audio) {
        audio.addEventListener('play', () => {
            resetOtherAudios(audio);
            handleAudioPlay(audio);
            updateMediaSession(audio);
        });

        audio.addEventListener('pause', () => {
            if (audio === currentAudio) {
                updateBottomBar(audio);
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (audio === currentAudio) {
                updateProgress(audio);
                try {
                    const lyrics = JSON.parse(audio.dataset.lyrics || '[]');
                    if (lyrics.length > 0) {
                        updateCurrentLyric(audio.currentTime, lyrics);
                    }
                } catch (e) {
                    console.error('解析歌词数据失败:', e);
                }
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            if (audio === currentAudio) {
                totalTimeSpan.textContent = formatTime(audio.duration);
            }
        });

        audio.preload = 'auto';
        audio.onerror = function(e) {
            console.error('音频错误:', e);
        };

        audio.addEventListener('loadeddata', () => {
            console.log('音频加载完成');
        });

        audio.addEventListener('error', (e) => {
            console.error('音频加载失败:', e);
        });
    }

    // 音频预加载
    class AudioPreloader {
        constructor() {
            this.audioElements = document.querySelectorAll('audio');
            this.loadedCount = 0;
        }

        preload() {
            this.audioElements.forEach(audio => {
                const sourceUrl = audio.querySelector('source').src;
                
                // 只预加载前两首歌
                if (this.loadedCount < 2) {
                    audioManager.preloadAudio(sourceUrl);
                    this.loadedCount++;
                }

                audio.addEventListener('play', () => {
                    // 当前歌曲播放时，预加载下一首
                    const nextAudio = this.getNextAudio(audio);
                    if (nextAudio) {
                        const nextUrl = nextAudio.querySelector('source').src;
                        audioManager.preloadAudio(nextUrl);
                    }
                });
            });
        }

        getNextAudio(currentAudio) {
            const audioArray = Array.from(this.audioElements);
            const currentIndex = audioArray.indexOf(currentAudio);
            return audioArray[currentIndex + 1] || null;
        }
    }

    // 初始化音频管理器
    const audioManager = new AudioManager();

    const preloader = new AudioPreloader();
    preloader.preload();

    const video = document.getElementById('bgVideo');
    
    // 检查视频是否可以播放
    function checkVideoPlayback() {
        const promise = video.play();
        
        if (promise !== undefined) {
            promise.catch(error => {
                console.error('自动播放失败:', error);
                // 添加点击播放功能
                document.body.addEventListener('click', () => {
                    video.play();
                }, { once: true });
            });
        }
    }

    // 视频加载完成后检查
    video.addEventListener('loadedmetadata', checkVideoPlayback);
    
    // 错误处理
    video.addEventListener('error', function(e) {
        console.error('视频加载失败:', e);
        document.body.style.backgroundColor = '#f0f0f0';
    });

    // 检查视频是否加载
    video.addEventListener('loadeddata', function() {
        console.log('视频已加载');
    });
    
    // 错误处理
    video.addEventListener('error', function(e) {
        console.error('视频加载错误:', e);
    });
    
    // 确保视频自动播放
    const playVideo = function() {
        video.play().catch(function(error) {
            console.log("视频自动播放失败:", error);
        });
    };
    
    // 尝试播放视频
    playVideo();
    
    // 用户交互后再次尝试播放
    document.addEventListener('click', playVideo);
});