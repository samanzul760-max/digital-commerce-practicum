<template>
  <div data-practicum-shell class="site learnec-role-shell">
      <!-- ========== 顶栏 ========== -->
      <header class="top" data-od-id="topnav">
        <NuxtLink to="/practicum/learnec-workbench" class="logo" aria-label="返回 LearnEC 实训工作台">
          <b>L</b>
          <span>LearnEC</span>
        </NuxtLink>

        <!-- 学员导航 -->
        <nav v-if="!isAdmin" class="tabs" data-od-id="student-tabs" aria-label="学员导航">
          <button :class="{ active: studentPage === 'home' }" data-page="home" @click="studentPage = 'home'">首页</button>
          <button :class="{ active: studentPage === 'courses' }" data-page="courses" @click="studentPage = 'courses'">课程大厅</button>
          <button :class="{ active: studentPage === 'center' }" data-page="center" @click="studentPage = 'center'">学员中心</button>
          <button :class="{ active: studentPage === 'learn' }" data-page="learn" @click="studentPage = 'learn'">实操学习</button>
        </nav>

        <!-- 管理导航 -->
        <nav v-else class="tabs" data-od-id="admin-tabs" aria-label="管理导航">
          <button :class="{ active: adminPage === 'a-dash' }" data-apage="a-dash" @click="adminPage = 'a-dash'">管理控制台</button>
        </nav>

        <div class="top-right">
          <!-- 角色切换 -->
          <div class="role" data-od-id="role-switch" title="切换角色预览">
            <button type="button" :class="{ on: !isAdmin }" data-role-student @click="switchToStudent">学员</button>
            <button type="button" :class="{ on: isAdmin }" data-role-admin @click="switchToAdmin">管理</button>
          </div>

          <!-- 通知 -->
          <button
            class="bell"
            :class="{ 'has-unread': unreadCount > 0 }"
            aria-label="通知"
            @click="toggleNotifications"
          >
            <i data-lucide="bell"></i>
            <span v-if="unreadCount" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>

          <!-- 通知下拉 -->
          <section v-if="showNotifications" class="topbar-dropdown notification-dropdown" aria-label="消息通知">
            <div class="dropdown-header">
              <div>
                <strong>消息通知</strong>
                <span>查看近期消息和任务提醒</span>
              </div>
              <button v-if="unreadCount" type="button" class="link" @click="markAllNotificationsRead">全部已读</button>
            </div>
            <ul v-if="recentNotifications.length" class="dropdown-list">
              <li v-for="n in recentNotifications" :key="n.id" :class="{ 'dropdown-item-unread': !n.read }">
                <a :href="n.targetRoute" class="dropdown-link" @click.prevent="goNotification(n)">
                  <span class="dropdown-icon"><i data-lucide="bell"></i></span>
                  <span class="dropdown-copy">
                    <strong>{{ n.title }}</strong>
                    <span>{{ formatTime(n.createdAt) }}</span>
                  </span>
                </a>
              </li>
            </ul>
            <p v-else class="dropdown-empty">暂无通知</p>
          </section>

          <!-- 用户头像 -->
          <div class="avatar" id="user-av" @click="toggleProfile">{{ avatarText }}</div>

          <!-- 个人下拉菜单 -->
          <section v-if="showProfile" class="topbar-dropdown profile-dropdown" aria-label="个人菜单">
            <div class="dropdown-header">
              <div>
                <strong>{{ displayName }}</strong>
                <span>{{ workspaceDescription }}</span>
              </div>
              <span class="role-chip">{{ roleLabel }}</span>
            </div>
            <div class="dropdown-list">
              <NuxtLink to="/practicum/profile" class="dropdown-link" @click="showProfile = false">
                <span class="dropdown-icon"><i data-lucide="shield"></i></span>
                <span class="dropdown-copy"><strong>账号设置</strong><span>查看当前账户和登录身份</span></span>
              </NuxtLink>
              <NuxtLink v-if="activeRole === 'OWNER'" to="/practicum/members" class="dropdown-link" @click="showProfile = false">
                <span class="dropdown-icon"><i data-lucide="users"></i></span>
                <span class="dropdown-copy"><strong>成员管理</strong><span>管理教师、学生与分组</span></span>
              </NuxtLink>
              <NuxtLink v-if="activeRole === 'OWNER'" to="/practicum/room-settings" class="dropdown-link" @click="showProfile = false">
                <span class="dropdown-icon"><i data-lucide="settings"></i></span>
                <span class="dropdown-copy"><strong>培训室设置</strong><span>维护当前培训室配置</span></span>
              </NuxtLink>
              <div class="profile-role-options" aria-label="切换身份">
                <button
                  v-for="role in authorizedRoles"
                  :key="role"
                  type="button"
                  class="dropdown-link dropdown-button"
                  :class="{ active: role === activeRole }"
                  :disabled="roleSwitching || role === activeRole"
                  @click="handleRoleChange(role)"
                >
                  <span class="dropdown-icon"><i data-lucide="refresh-cw"></i></span>
                  <span class="dropdown-copy"><strong>{{ roleLabels[role] }}</strong><span>切换到此身份视角</span></span>
                </button>
              </div>
              <button type="button" class="dropdown-link" @click="handleLogout">
                <span class="dropdown-icon"><i data-lucide="log-out"></i></span>
                <span class="dropdown-copy"><strong>退出登录</strong><span>安全退出当前账户</span></span>
              </button>
            </div>
          </section>

          <!-- CTA按钮 -->
          <button class="btn btn-primary btn-sm" id="top-cta" @click="handlePrimaryAction">
            {{ primaryActionLabel }}
          </button>
        </div>
      </header>

      <!-- ==================== 加载态 ==================== -->
      <div v-if="pageLoading" class="wrap" style="padding:80px 40px;text-align:center">
        <p style="color:var(--muted)">正在加载工作台数据…</p>
      </div>

      <!-- ==================== 学员端 ==================== -->
      <div v-else-if="!isAdmin" class="shell-s on">
        <!-- 首页 -->
        <section v-show="studentPage === 'home'" class="view active" data-od-id="page-home">
          <div class="wrap">
            <div class="hero">
              <div>
                <div class="eyebrow">Digital Commerce Practicum</div>
                <h1>用真实店铺任务<br>学会电商经营</h1>
                <p class="lede">课程、模拟店铺与老师批阅连成一条线。少一点界面噪音，多一点完成感。</p>
                <div class="hero-cta">
                  <button class="btn btn-primary btn-lg" @click="studentPage = 'learn'"><i data-lucide="play" style="width:16px;height:16px"></i>继续学习</button>
                  <button class="btn btn-ghost btn-lg" @click="studentPage = 'courses'">浏览课程</button>
                </div>
              </div>
              <div class="hero-scene">
                <img src="/assets/hero-classroom.jpg" alt="实训课堂" />
                <div class="hero-badge"><span class="dot"></span>本周实训 · <b style="margin-left:4px">{{ primaryPlanTitle }}</b></div>
              </div>
            </div>

            <div class="resume" data-od-id="resume">
              <div class="resume-card">
                <div>
                  <div class="lbl">继续上次</div>
                  <h3>{{ primaryPlanTitle }}</h3>
                  <p>已完成 {{ planProgress.completed }} / {{ planProgress.total }} 个任务 · 进度 {{ planProgress.percent }}%</p>
                  <div class="track"><i :style="{ width: planProgress.percent + '%' }"></i></div>
                </div>
                <button class="btn btn-primary" @click="studentPage = 'learn'">接着学</button>
              </div>
              <div class="resume-card">
                <div>
                  <div class="lbl">待办</div>
                  <h3>{{ pendingTaskCount }} 个任务待处理</h3>
                  <p>{{ nextTaskLabel }}</p>
                </div>
                <button class="btn btn-ghost" @click="studentPage = 'center'">去处理</button>
              </div>
            </div>

            <div class="section">
              <div class="section-head">
                <div><h2>学习路径</h2><p>三条清晰进阶线，而不是一堆散课。</p></div>
              </div>
              <div class="paths" data-od-id="paths">
                <div class="path" @click="studentPage = 'courses'"><div class="n">01</div><h3>开店起航</h3><span>选品 · 上架 · 详情页</span></div>
                <div class="path" @click="studentPage = 'courses'"><div class="n">02</div><h3>内容与直播</h3><span>脚本 · 场控 · 复盘</span></div>
                <div class="path" @click="studentPage = 'courses'"><div class="n">03</div><h3>数据增长</h3><span>读数 · 投放 · 转化</span></div>
              </div>

              <div class="section-head">
                <div><h2>热门课程</h2><p>从真实业务任务开始。</p></div>
                <button class="link" @click="studentPage = 'courses'">全部课程 →</button>
              </div>
              <div class="cards" id="home-cards">
                <article
                  v-for="(plan, idx) in publishedPlans.slice(0, 3)"
                  :key="plan.id"
                  class="course-card"
                  role="button"
                  tabindex="0"
                  @click="openPlanInLearn(plan)"
                  @keydown.enter.space.prevent="openPlanInLearn(plan)"
                >
                  <div :class="['course-banner', bannerColors[idx % bannerColors.length]]">
                    <span class="cat">{{ categoryLabel(plan) }}</span>
                    <h3>{{ plan.title }}</h3>
                  </div>
                  <div class="course-body">
                    <b>{{ categoryLabel(plan) }}</b>
                    <span>{{ plan.description || '暂无简介' }}</span>
                    <div class="course-meta">
                      <span class="stars">★★★★★</span>
                      <span class="tag">{{ plan.status === 'PUBLISHED' ? '实训计划' : '草稿' }}</span>
                    </div>
                  </div>
                </article>
                <p v-if="!publishedPlans.length" class="course-empty">暂无已发布的课程，等待教学管理员发布。</p>
              </div>
            </div>
          </div>
          <footer class="foot"><span>LearnEC · 数字商贸实训工作台</span><span class="num">STUDENT WORKSPACE</span></footer>
        </section>

        <!-- 课程大厅 -->
        <section v-show="studentPage === 'courses'" class="view active" data-od-id="page-courses">
          <div class="hall">
            <aside class="filters" data-od-id="filters">
              <h4>分类</h4>
              <label class="filter"><input v-model="courseCategories" type="checkbox" value="all" @change="onFilterChange('category', 'all')">全部</label>
              <label class="filter"><input v-model="courseCategories" type="checkbox" value="直播运营" @change="onFilterChange('category', '直播运营')">直播运营</label>
              <label class="filter"><input v-model="courseCategories" type="checkbox" value="店铺增长" @change="onFilterChange('category', '店铺增长')">店铺增长</label>
              <label class="filter"><input v-model="courseCategories" type="checkbox" value="数据分析" @change="onFilterChange('category', '数据分析')">数据分析</label>
              <h4>难度</h4>
              <label class="filter"><input v-model="courseLevels" type="checkbox" value="all" @change="onFilterChange('level', 'all')">全部</label>
              <label class="filter"><input v-model="courseLevels" type="checkbox" value="入门" @change="onFilterChange('level', '入门')">入门</label>
              <label class="filter"><input v-model="courseLevels" type="checkbox" value="进阶" @change="onFilterChange('level', '进阶')">进阶</label>
              <h4>类型</h4>
              <label class="filter"><input v-model="courseTypes" type="checkbox" value="免费" @change="onFilterChange('type', '免费')">免费</label>
              <label class="filter"><input v-model="courseTypes" type="checkbox" value="实训计划" @change="onFilterChange('type', '实训计划')">实训计划</label>
            </aside>
            <main class="hall-main">
              <div class="section-head" style="margin-bottom:24px">
                <div><h2>课程大厅</h2><p>共 {{ allPlans.length }} 门实训课</p></div>
              </div>
              <div class="hall-tools">
                <input v-model="courseSearchQuery" class="search" placeholder="搜索课程或技能" @input="applyCourseFilters" />
                <select v-model="courseSort" class="select" aria-label="课程排序" @change="applyCourseFilters">
                  <option value="recommended">推荐排序</option>
                  <option value="name">课程名称</option>
                </select>
              </div>
              <p class="course-result" aria-live="polite">显示 {{ filteredCourses.length }} 门课程</p>
              <div class="cards" id="course-grid">
                <article
                  v-for="(plan, idx) in filteredCourses"
                  :key="plan.id"
                  class="course-card"
                  role="button"
                  tabindex="0"
                  @click="openPlanInLearn(plan)"
                  @keydown.enter.space.prevent="openPlanInLearn(plan)"
                >
                  <div :class="['course-banner', bannerColors[idx % bannerColors.length]]" style="height:100px">
                    <span class="cat">{{ categoryLabel(plan) }}</span>
                    <h3 style="font-size:18px">{{ plan.title }}</h3>
                  </div>
                  <div class="course-body">
                    <b>{{ categoryLabel(plan) }}</b>
                    <span>{{ plan.description || '暂无简介' }}</span>
                    <div class="course-meta">
                      <span class="stars">★★★★★</span>
                      <span class="tag">{{ plan.status === 'PUBLISHED' ? '实训计划' : '草稿' }}</span>
                    </div>
                  </div>
                </article>
                <p v-if="!filteredCourses.length" class="course-empty">没有找到匹配课程，请调整筛选条件或搜索词。</p>
              </div>
            </main>
          </div>
        </section>

        <!-- 学员中心 -->
        <section v-show="studentPage === 'center'" class="view active" data-od-id="page-center">
          <div class="dash">
            <aside class="side" data-od-id="dash-side">
              <button :class="{ active: centerNav === 'overview' }" @click="centerNav = 'overview'"><i data-lucide="layout-dashboard"></i>概况</button>
              <button :class="{ active: centerNav === 'tasks' }" @click="centerNav = 'tasks'"><i data-lucide="clipboard-list"></i>任务<span v-if="pendingTaskCount" style="margin-left:auto;font:600 10px var(--font-mono);background:var(--danger);color:#fff;padding:2px 7px;border-radius:999px">{{ pendingTaskCount }}</span></button>
              <button :class="{ active: centerNav === 'shop' }" @click="centerNav = 'shop'"><i data-lucide="store"></i>模拟店铺</button>
              <button :class="{ active: centerNav === 'achievements' }" @click="centerNav = 'achievements'"><i data-lucide="trophy"></i>成就</button>
            </aside>
            <main class="dash-main">

              <!-- ═══ 概况面板 ═══ -->
              <template v-if="centerNav === 'overview'">
              <div class="welcome" data-od-id="welcome">
                <div>
                  <h1>你好，{{ displayName }}</h1>
                  <p>本周还差 <b>{{ remainingTasks }} 个任务</b> · 已连续学习 <b class="num">7</b> 天</p>
                </div>
                <div class="medals">
                  <div class="medal g"><i data-lucide="award"></i></div>
                  <div class="medal s"><i data-lucide="medal"></i></div>
                  <div class="medal b"><i data-lucide="star"></i></div>
                </div>
              </div>
              <div class="stat-row">
                <div class="stat"><div class="l">进行中</div><div class="v num">{{ progressPlans.length }}</div></div>
                <div class="stat"><div class="l">待交作业</div><div class="v num">{{ pendingTaskCount }}</div></div>
                <div class="stat"><div class="l">作品集</div><div class="v num">5</div></div>
              </div>
              <div class="two">
                <div>
                  <section class="paper" data-od-id="progress">
                    <h3>学习进度 <span class="m">本周</span></h3>
                    <div v-if="progressPlans.length">
                      <div v-for="(p, i) in progressPlans" :key="p.id" class="prog">
                        <div class="thumb" :style="{ background: progressColors[Number(i) % progressColors.length] }"></div>
                        <div class="name">{{ p.title }}<div class="track"><i :style="{ width: String(p.percent) + '%' }"></i></div></div>
                        <span class="pct">{{ p.percent }}%</span>
                      </div>
                    </div>
                    <p v-else style="color:var(--muted);font-size:13px;padding:12px 0">暂无学习进度数据。</p>
                  </section>
                  <section class="paper" style="margin-top:16px" data-od-id="todo-panel">
                    <h3>待办与工坊 <span class="m">入口</span></h3>
                    <div v-if="studentTaskItems.length">
                      <div v-for="task in studentTaskItems" :key="task.id" class="entry">
                        <div><b>{{ task.title }}</b><span>{{ task.subtitle }}</span></div>
                        <span :class="['pill', task.pillClass]">{{ task.statusLabel }}</span>
                      </div>
                    </div>
                    <div v-else class="entry"><div><b>暂无待办</b><span>完成课程任务后会显示在这里</span></div><span class="pill pill-ok">完成</span></div>
                  </section>
                </div>
                <section class="paper" data-od-id="calendar">
                  <h3>学习日历 <span class="m num">{{ currentMonth }}</span></h3>
                  <div class="cal">
                    <span v-for="d in weekDays" :key="d" class="wd">{{ d }}</span>
                    <b v-for="(day, i) in calendarDays" :key="i" :class="{ hl: day.highlight, td: day.today }">{{ day.label }}</b>
                  </div>
                  <div class="remind">
                    <div class="when">周五 19:30</div>
                    <b>直播复盘：商品详情页</b>
                    <p>周老师 · 约 45 分钟</p>
                  </div>
                </section>
              </div>
              </template>

              <!-- ═══ 任务面板 ═══ -->
              <template v-if="centerNav === 'tasks'">
                <div style="margin-bottom:28px"><h1 style="font-size:28px">我的任务</h1><p style="color:var(--muted);font-size:14px;margin-top:6px">待提交、待修改和老师反馈。</p></div>
                <div class="stat-row">
                  <div class="stat"><div class="l">待提交</div><div class="v num">{{ studentTasks.filter((t:any)=>!['SUBMITTED','GRADED'].includes(t.status)).length }}</div></div>
                  <div class="stat"><div class="l">待修改</div><div class="v num">{{ studentTasks.filter((t:any)=>t.status==='RETURNED').length }}</div></div>
                  <div class="stat"><div class="l">已完成</div><div class="v num">{{ studentTasks.filter((t:any)=>t.status==='GRADED').length }}</div></div>
                </div>
                <section class="paper">
                  <h3>任务列表</h3>
                  <div v-if="studentTasks.length">
                    <div v-for="t in studentTasks.slice(0,8)" :key="t.id" class="entry">
                      <div><b>{{ t.activity?.title || '学习任务' }}</b><span>{{ t.source?.title || '' }} · {{ t.status === 'SUBMITTED' ? '已提交·待批' : t.status === 'RETURNED' ? '已退回·需修改' : t.status === 'GRADED' ? '已评分' : '进行中' }}</span></div>
                      <span :class="['pill', t.status==='SUBMITTED'?'pill-warn':t.status==='RETURNED'?'pill-info':t.status==='GRADED'?'pill-ok':'']" style="font-size:12px">{{ t.status==='SUBMITTED'?'待批':t.status==='RETURNED'?'修改':t.status==='GRADED'?'完成':'进行' }}</span>
                    </div>
                  </div>
                  <p v-else style="color:var(--muted);font-size:13px;padding:12px 0">暂无任务，完成课程活动后任务会自动出现在这里。</p>
                </section>
              </template>

              <!-- ═══ 模拟店铺面板 ═══ -->
              <template v-if="centerNav === 'shop'">
                <div style="margin-bottom:28px"><h1 style="font-size:28px">模拟店铺</h1><p style="color:var(--muted);font-size:14px;margin-top:6px">管理商品和运费模板。</p></div>
                <div style="display:flex;gap:10px;margin-bottom:20px">
                  <button :class="['btn', shopTab==='products'?'btn-primary':'btn-ghost','btn-sm']" @click="shopTab='products'">商品列表</button>
                  <button :class="['btn', shopTab==='freight'?'btn-primary':'btn-ghost','btn-sm']" @click="shopTab='freight'">运费模板</button>
                </div>
                <section v-if="shopTab==='products'" class="paper">
                  <h3>商品 <span class="m">{{ shopProducts.length }} 件</span></h3>
                  <div v-if="shopProducts.length" class="table-wrap" style="margin-top:12px">
                    <table class="data"><thead><tr><th>名称</th><th>分类</th><th>价格</th><th>状态</th></tr></thead><tbody>
                      <tr v-for="p in shopProducts.slice(0,10)" :key="p.id"><td><b>{{ p.title }}</b></td><td>{{ p.category || '未分类' }}</td><td class="num">¥{{ p.basePrice }}</td><td><span :class="['pill', p.status==='ACTIVE'?'pill-ok':'']" style="font-size:12px">{{ p.status==='ACTIVE'?'上架':'下架' }}</span></td></tr>
                    </tbody></table>
                  </div>
                  <p v-else style="color:var(--muted);font-size:13px;padding:12px 0">暂无商品，前往完整店铺页面创建。</p>
                </section>
                <section v-else class="paper">
                  <h3>运费模板 <span class="m">{{ shopFreightTemplates.length }} 个</span></h3>
                  <div v-if="shopFreightTemplates.length" class="table-wrap" style="margin-top:12px">
                    <table class="data"><thead><tr><th>名称</th><th>计费方式</th><th>首费</th><th>包邮门槛</th></tr></thead><tbody>
                      <tr v-for="f in shopFreightTemplates.slice(0,10)" :key="f.id"><td><b>{{ f.name }}</b></td><td>{{ f.chargeType==='PIECE'?'按件':'按重' }}</td><td class="num">¥{{ f.firstFee }}</td><td class="num">{{ f.freeShippingThreshold ? '¥'+f.freeShippingThreshold : '—' }}</td></tr>
                    </tbody></table>
                  </div>
                  <p v-else style="color:var(--muted);font-size:13px;padding:12px 0">暂无运费模板。</p>
                </section>
              </template>

              <!-- ═══ 成就面板 ═══ -->
              <template v-if="centerNav === 'achievements'">
                <div style="margin-bottom:28px"><h1 style="font-size:28px">成就</h1><p style="color:var(--muted);font-size:14px;margin-top:6px">{{ achievementBadges.filter((b:any)=>b.state==='unlocked').length }} / {{ achievementBadges.length }} 枚勋章已解锁</p></div>
                <section class="paper" style="margin-bottom:16px">
                  <h3>勋章墙</h3>
                  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px">
                    <div v-for="b in achievementBadges" :key="b.id" style="text-align:center;padding:16px 8px;border-radius:12px;border:1px solid var(--border);opacity:.4" :style="b.state==='unlocked'?{opacity:1,background:'var(--accent-soft)'}:b.state==='in_progress'?{opacity:.75}:{}">
                      <div style="font-size:28px;margin-bottom:4px">{{ b.icon }}</div>
                      <div style="font:600 13px var(--font-body)">{{ b.name }}</div>
                      <div style="font-size:11px;color:var(--muted);margin-top:4px">{{ b.state==='unlocked'?'已解锁':b.state==='in_progress'?b.progress+'/'+b.target:'未解锁' }}</div>
                      <div v-if="b.state==='in_progress'" class="track" style="margin-top:8px;max-width:none"><i :style="{width:(b.progress/b.target*100)+'%'}"></i></div>
                    </div>
                  </div>
                </section>
                <section class="paper" style="margin-bottom:16px">
                  <h3>技能矩阵</h3>
                  <div v-for="s in achievementSkills" :key="s.name" class="prog">
                    <div class="name" style="grid-column:1/-1">{{ s.name }}<div class="track"><i :style="{width:s.percent+'%'}"></i></div></div>
                    <span class="pct" style="grid-column:3">{{ s.percent }}%</span>
                  </div>
                </section>
                <section class="paper">
                  <h3>解锁时间线</h3>
                  <div v-for="t in achievementTimeline.slice(0,5)" :key="t.id" class="entry">
                    <div><b>{{ t.title }}</b><span>{{ t.detail }}</span></div>
                    <span style="font:500 11px var(--font-mono);color:var(--muted)">{{ t.date }}</span>
                  </div>
                </section>
              </template>

            </main>
          </div>
        </section>

        <!-- 实操学习 -->
        <section v-show="studentPage === 'learn'" class="view active" data-od-id="page-learn">
          <div class="learn">
            <aside class="outline" data-od-id="outline">
              <h4>大纲</h4>
              <div
                v-for="(lesson, i) in currentLessons"
                :key="i"
                :class="{ active: currentLessonIndex === i, done: lesson.done }"
                role="button"
                tabindex="0"
                @click="selectLesson(i)"
                @keydown.enter.space.prevent="selectLesson(i)"
              >
                <i :data-lucide="lesson.done ? 'check-circle-2' : currentLessonIndex === i ? 'square-play' : 'circle'"></i>
                {{ lesson.title }}
              </div>
              <h4>材料</h4>
              <div><i data-lucide="download"></i>选品模板</div>
              <div><i data-lucide="file-text"></i>评分标准</div>
            </aside>
            <main class="lesson">
              <!-- 课程/案例切换 -->
              <div style="display:flex;gap:8px;margin-bottom:24px">
                <button :class="['btn','btn-sm', learnMode==='course'?'btn-primary':'btn-ghost']" @click="learnMode='course'">课程学习</button>
                <button :class="['btn','btn-sm', learnMode==='cases'?'btn-primary':'btn-ghost']" @click="learnMode='cases'">教学案例 <span style="font:600 10px var(--font-mono);opacity:.7">6</span></button>
              </div>

              <!-- 课程模式 -->
              <template v-if="learnMode==='course'">
              <h1 id="lesson-title">{{ currentLessonTitle }}</h1>
              <p class="sub" id="lesson-subtitle">{{ currentLessonSubtitle }}</p>
              <div class="video" :class="{ playing: videoPlaying }" data-od-id="video">
                <img src="/assets/lesson-video.jpg" alt="课程视频" />
                <button class="play" aria-label="播放" @click="toggleVideo">
                  <i :data-lucide="videoPlaying ? 'pause' : 'play'"></i>
                </button>
                <div class="video-bar">
                  <span class="num">{{ videoPlaying ? '07:52' : '04:03' }}</span>
                  <div class="rail"><i :style="{ width: videoPlaying ? '64%' : '32%' }"></i></div>
                  <span class="num">12:38</span>
                </div>
              </div>
              <div class="task-box" data-od-id="task">
                <h3>实操任务</h3>
                <p>下载选品模板，挑选 3 个候选商品并说明理由。完成后进入批阅队列，也可同步到模拟店铺。</p>
                <div class="actions">
                  <button class="btn btn-primary" :disabled="taskSubmitted" @click="submitTask">{{ taskSubmitted ? '已提交' : '提交作业' }}</button>
                  <button class="btn btn-ghost" @click="saveDraft">存草稿</button>
                  <button class="btn btn-ghost" @click="studentPage = 'center'">打开工坊</button>
                </div>
                <p class="learn-status" aria-live="polite">{{ learnStatusMsg }}</p>
              </div>
              </template>

              <!-- 案例模式 -->
              <template v-if="learnMode==='cases'">
                <div v-if="selectedCase" style="margin-bottom:16px">
                  <button class="link" @click="selectedCase=null" style="font-size:13px">← 返回案例列表</button>
                </div>
                <!-- 案例列表 -->
                <div v-if="!selectedCase">
                  <h1>教学案例库</h1>
                  <p class="sub">六个原创匿名案例，覆盖商品发布、营销活动、交易处理和数据分析。</p>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px">
                    <div v-for="c in commerceCases" :key="c.id" class="paper" style="cursor:pointer;transition:transform .15s" @click="selectedCase=c" @keydown.enter.space.prevent="selectedCase=c" tabindex="0" role="button">
                      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
                        <div><b style="font-size:16px">{{ c.title }}</b><p style="color:var(--muted);font-size:13px;margin-top:4px;line-height:1.6">{{ c.summary }}</p></div>
                        <span :class="['pill', c.submissionMode==='SUBMITTABLE'?'pill-warn':'pill-info']" style="font-size:11px;flex:none">{{ c.submissionMode==='SUBMITTABLE'?'可提交':'课堂阅读' }}</span>
                      </div>
                      <div style="margin-top:12px;font-size:12px;color:var(--muted)">{{ c.category }} · {{ c.submissionMode==='SUBMITTABLE'?'3 个评分维度':'自检清单' }}</div>
                    </div>
                  </div>
                </div>
                <!-- 案例详情 -->
                <div v-else>
                  <h1>{{ selectedCase.title }}</h1>
                  <p class="sub">{{ selectedCase.category }} · {{ selectedCase.submissionMode==='SUBMITTABLE'?'可提交作业':'课堂自检' }}</p>
                  <div class="paper" style="margin-top:20px">
                    <h3>情境</h3><p style="color:var(--muted);font-size:14px;line-height:1.7;margin-top:8px">{{ selectedCase.scenario }}</p>
                    <h3 style="margin-top:20px">学习目标</h3>
                    <ul style="margin-top:8px;padding-left:20px;color:var(--muted);font-size:14px;line-height:2">
                      <li v-for="obj in selectedCase.learningObjectives" :key="obj">{{ obj }}</li>
                    </ul>
                    <h3 style="margin-top:20px">任务</h3><p style="color:var(--muted);font-size:14px;line-height:1.7;margin-top:8px">{{ selectedCase.studentTask }}</p>
                    <h3 style="margin-top:20px">步骤</h3>
                    <div v-for="(step,i) in selectedCase.steps" :key="i" style="display:flex;gap:10px;align-items:start;padding:6px 0;font-size:14px;color:var(--muted)">
                      <span style="font:600 12px var(--font-mono);color:var(--accent);flex:none;margin-top:2px">{{ Number(i)+1 }}</span>
                      <span>{{ step }}</span>
                    </div>
                    <div style="margin-top:16px;padding:14px 18px;background:var(--bg);border-radius:10px;font-size:13px;color:var(--muted)">
                      <b style="color:var(--fg)">示例：</b>{{ selectedCase.example }}
                    </div>
                    <!-- 自检清单 -->
                    <h3 style="margin-top:20px">自检清单</h3>
                    <div v-for="(item,i) in selectedCase.selfCheckItems" :key="i" style="display:flex;gap:8px;align-items:start;padding:6px 0;font-size:13px;color:var(--muted)">
                      <span style="color:var(--success);flex:none">✓</span>
                      <span>{{ item }}</span>
                    </div>
                    <!-- 提交区域（仅可提交案例） -->
                    <template v-if="selectedCase.submissionMode==='SUBMITTABLE'">
                      <h3 style="margin-top:20px">提交作业</h3>
                      <textarea v-model="caseAnswer" class="ta" style="margin-top:8px" placeholder="写下你的答案..."></textarea>
                      <div style="display:flex;gap:10px;margin-top:12px">
                        <button class="btn btn-primary btn-sm" :disabled="caseSubmitting||!caseAnswer.trim()" @click="submitCase">{{ caseSubmitting?'提交中…':'提交' }}</button>
                        <button class="btn btn-ghost btn-sm" @click="caseAnswer=''">清空</button>
                      </div>
                      <p v-if="caseResult" style="margin-top:8px;font-size:13px;color:var(--success)">{{ caseResult }}</p>
                    </template>
                  </div>
                </div>
              </template>

            </main>
            <aside class="drawer" data-od-id="drawer">
              <h3>导师与讨论</h3>
              <div class="teacher">
                <img src="/assets/teacher-avatar.jpg" alt="周老师" />
                <div><b>周老师</b><p>电商运营实战导师</p></div>
              </div>
              <div class="comment"><b>吴可欣</b><p>选品模板很清楚，跟着做就有方向。</p></div>
              <div class="comment"><b>李明</b><p>希望多一些失败案例拆解。</p></div>
            </aside>
          </div>
        </section>
      </div>

      <!-- ==================== 管理端 ==================== -->
      <div v-else class="shell-a on">
        <div class="admin">
          <aside class="admin-side" data-od-id="admin-side">
            <div class="lbl">{{ isOwner ? '管理工作台' : '教师工作台' }}</div>
            <button :class="{ active: adminPage === 'a-dash' }" data-apage="a-dash" @click="adminPage = 'a-dash'"><i data-lucide="layout-dashboard"></i>概览</button>
            <button :class="{ active: adminPage === 'a-courses' }" data-apage="a-courses" @click="adminPage = 'a-courses'"><i data-lucide="library"></i>课程 / 计划</button>
            <button v-if="isOwner" :class="{ active: adminPage === 'a-class' }" data-apage="a-class" @click="adminPage = 'a-class'"><i data-lucide="users"></i>班级与学员</button>
            <button :class="{ active: adminPage === 'a-review' }" data-apage="a-review" @click="adminPage = 'a-review'"><i data-lucide="clipboard-check"></i>作业批改 <span v-if="pendingReviewCount" class="badge">{{ pendingReviewCount }}</span></button>
            <button v-if="isOwner" :class="{ active: adminPage === 'a-stats' }" data-apage="a-stats" @click="adminPage = 'a-stats'"><i data-lucide="bar-chart-3"></i>成绩与分析</button>
          </aside>

          <div class="admin-main">
            <!-- 概览 -->
            <section v-show="adminPage === 'a-dash'" class="view active" data-od-id="admin-dash">
              <div class="page-h">
                <div><h1>欢迎回来，{{ displayName }}</h1><p>今日平台运营与待办批阅一览。</p></div>
                <button class="btn btn-primary" @click="adminPage = 'a-courses'"><i data-lucide="plus" style="width:16px;height:16px"></i>新建计划</button>
              </div>
              <div class="kpi-4">
                <div class="kpi"><div class="l">活跃学员</div><div class="v num">{{ adminKpis.activeLearners }}</div><div class="d">↑ 12 本周</div></div>
                <div class="kpi"><div class="l">待批作业</div><div class="v num">{{ adminKpis.pendingReviews }}</div><div class="d w">需优先处理</div></div>
                <div class="kpi"><div class="l">本周提交</div><div class="v num">{{ adminKpis.weeklySubmissions }}</div><div class="d">↑ 9%</div></div>
                <div class="kpi"><div class="l">平均完课</div><div class="v num">{{ adminKpis.avgCompletion }}%</div><div class="d">↑ 3pp</div></div>
              </div>
              <div class="two">
                <section class="paper">
                  <h3>主修课程运营 <span class="m">完成度</span></h3>
                  <div v-if="adminPlanProgress.length">
                    <div v-for="(p, i) in adminPlanProgress" :key="p.id" class="prog">
                      <div class="thumb" :style="{ background: progressColors[Number(i) % progressColors.length] }"></div>
                      <div class="name">{{ p.title }}<div class="track"><i :style="{ width: String(p.percent) + '%' }"></i></div></div>
                      <span class="pct">{{ p.percent }}%</span>
                    </div>
                  </div>
                  <p v-else style="color:var(--muted);font-size:13px">暂无课程数据。</p>
                </section>
                <section class="paper">
                  <h3>今日优先 <span class="m">队列</span></h3>
                  <div class="entry"><div><b>{{ pendingReviewCount }} 份作业待批</b><span>详情页 / 选品清单为主</span></div><button class="btn btn-primary btn-sm" @click="adminPage = 'a-review'">去批改</button></div>
                  <div class="entry"><div><b>3 名学员连续未交</b><span>直播话术 · 已提醒</span></div><span class="pill pill-warn">跟进</span></div>
                  <div class="entry"><div><b>周五复盘直播</b><span>19:30 · 需准备样例</span></div><span class="pill pill-info">日程</span></div>
                </section>
              </div>
            </section>

            <!-- 课程计划 -->
            <section v-show="adminPage === 'a-courses'" class="view active" data-od-id="admin-courses">
              <div class="page-h">
                <div><h1>课程与实训计划</h1><p>发布、归档与关联班级。</p></div>
                <button class="btn btn-primary" @click="navigateTo('/practicum/plans')">新建计划</button>
              </div>
              <div class="table-wrap">
                <table class="data">
                  <thead><tr><th>计划 / 课程</th><th>班级</th><th>学员</th><th>状态</th><th>进度</th><th></th></tr></thead>
                  <tbody>
                    <tr v-for="plan in allPlans" :key="plan.id">
                      <td><b>{{ plan.title }}</b></td>
                      <td>电商 1 班</td>
                      <td class="num">{{ planMemberCount(plan) }}</td>
                      <td><span :class="['pill', plan.status === 'PUBLISHED' ? 'pill-ok' : plan.status === 'ARCHIVED' ? '' : 'pill-info']" :style="plan.status === 'ARCHIVED' ? 'background:var(--bg);color:var(--muted)' : ''">{{ statusLabel(plan.status) }}</span></td>
                      <td class="num">{{ planCompletionPercent(plan) }}%</td>
                      <td><button class="btn btn-ghost btn-sm" @click="navigateTo('/practicum/plans/' + plan.id + '/edit')">管理</button></td>
                    </tr>
                    <tr v-if="!allPlans.length"><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">暂无计划，点击"新建计划"开始。</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- 计划/模板/竞赛 标签 -->
              <div style="display:flex;gap:8px;margin-top:28px">
                <button :class="['btn','btn-sm', adminCourseTab==='plans'?'btn-primary':'btn-ghost']" @click="adminCourseTab='plans'">教学计划</button>
                <button :class="['btn','btn-sm', adminCourseTab==='templates'?'btn-primary':'btn-ghost']" @click="adminCourseTab='templates'">实训模板</button>
                <button :class="['btn','btn-sm', adminCourseTab==='competitions'?'btn-primary':'btn-ghost']" @click="adminCourseTab='competitions'">竞赛</button>
              </div>

              <!-- 模板列表 -->
              <div v-if="adminCourseTab==='templates'" style="margin-top:20px">
                <div class="table-wrap">
                  <table class="data"><thead><tr><th>模板名称</th><th>描述</th><th>状态</th></tr></thead><tbody>
                    <tr v-for="t in templates" :key="t.id"><td><b>{{ t.title }}</b></td><td style="color:var(--muted);font-size:13px">{{ t.description || '—' }}</td><td><span :class="['pill',t.enabled?'pill-ok':'']" style="font-size:12px">{{ t.enabled?'启用':'禁用' }}</span></td></tr>
                    <tr v-if="!templates.length"><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">暂无模板。</td></tr>
                  </tbody></table>
                </div>
              </div>

              <!-- 竞赛列表 -->
              <div v-if="adminCourseTab==='competitions'" style="margin-top:20px">
                <div class="table-wrap">
                  <table class="data"><thead><tr><th>竞赛名称</th><th>状态</th><th>创建时间</th></tr></thead><tbody>
                    <tr v-for="c in competitions" :key="c.id"><td><b>{{ c.title }}</b></td><td><span :class="['pill',c.status==='PUBLISHED'?'pill-ok':c.status==='CLOSED'?'':'pill-info']" style="font-size:12px">{{ c.status==='PUBLISHED'?'进行中':c.status==='DRAFT'?'草稿':c.status==='CLOSED'?'已结束':c.status }}</span></td><td class="num" style="font-size:12px">{{ formatTime(c.createdAt) }}</td></tr>
                    <tr v-if="!competitions.length"><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">暂无竞赛。</td></tr>
                  </tbody></table>
                </div>
              </div>
            </section>

            <!-- 班级学员 -->
            <section v-show="adminPage === 'a-class'" class="view active" data-od-id="admin-class">
              <div class="page-h">
                <div><h1>班级与学员</h1><p>进度、风险与最近活跃。</p></div>
                <div style="display:flex;gap:10px">
                  <input v-model="memberSearchQuery" class="search" placeholder="搜索学员" style="width:200px" />
                  <button class="btn btn-ghost" @click="navigateTo('/practicum/members')">导出</button>
                </div>
              </div>
              <div class="table-wrap">
                <table class="data">
                  <thead><tr><th>学员</th><th>班级</th><th>进度</th><th>待交</th><th>最近活跃</th><th>状态</th></tr></thead>
                  <tbody>
                    <tr v-for="member in filteredMembers" :key="member.id">
                      <td><b>{{ member.label }}</b></td>
                      <td>{{ member.group || '未分组' }}</td>
                      <td class="num">{{ member.progress || 0 }}%</td>
                      <td class="num">{{ member.pending || 0 }}</td>
                      <td class="num">{{ member.lastActive || '--' }}</td>
                      <td><span :class="['pill', member.status === '正常' ? 'pill-ok' : 'pill-warn']">{{ member.status }}</span></td>
                    </tr>
                    <tr v-if="!filteredMembers.length"><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">暂无学员数据。</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- 作业批改 -->
            <section v-show="adminPage === 'a-review'" class="view active" data-od-id="admin-review">
              <div class="page-h">
                <div><h1>作业与实操批改</h1><p>草稿已过滤 · 当前队列 {{ reviewQueue.length }} 份</p></div>
              </div>
              <div class="review-grid">
                <div class="table-wrap review-list">
                  <div
                    v-for="(item, idx) in reviewQueue"
                    :key="item.submissionId"
                    :class="['item', { on: selectedReviewIdx === idx }]"
                    @click="selectReview(idx)"
                  >
                    <div>
                      <b>{{ item.studentLabel }} · {{ item.activityTitle }}</b>
                      <div style="color:var(--muted);font-size:13px;margin-top:4px">{{ item.planTitle }} · {{ formatTime(item.submittedAt) }}</div>
                    </div>
                    <span :class="['pill', item.status === 'SUBMITTED' ? 'pill-warn' : item.status === 'RETURNED' ? 'pill-info' : 'pill-ok']">{{ reviewStatusLabel(item.status) }}</span>
                  </div>
                  <div v-if="!reviewQueue.length" style="padding:24px;color:var(--muted);text-align:center">暂无待批作业。</div>
                </div>
                <section v-if="selectedReview" class="paper review-pane" data-od-id="review-pane">
                  <h3 style="margin-bottom:8px">{{ selectedReview.studentLabel }} · {{ selectedReview.activityTitle }}</h3>
                  <p style="color:var(--muted);font-size:13px;margin-bottom:16px">已提交作业，请评分并给可执行建议。</p>
                  <div style="height:120px;border-radius:12px;background:linear-gradient(135deg,var(--accent-soft),oklch(94% 0.02 280));border:1px solid var(--border);display:grid;place-items:center;color:var(--muted);font-size:13px;margin-bottom:8px">实操截图预览</div>
                  <label style="font-size:13px;color:var(--muted)">评分 0–100</label>
                  <input v-model="reviewScore" class="score-in num" placeholder="例如 88" type="number" min="0" max="100" />
                  <div class="tags">
                    <button type="button" @click="reviewFeedback += '排版清晰 '">排版清晰</button>
                    <button type="button" @click="reviewFeedback += '转化逻辑好 '">转化逻辑好</button>
                    <button type="button" @click="reviewFeedback += '需补证据 '">需补证据</button>
                  </div>
                  <textarea v-model="reviewFeedback" class="ta" placeholder="写下可执行的修改建议…"></textarea>
                  <div style="display:flex;gap:10px;margin-top:16px">
                    <button class="btn btn-primary" style="flex:1" :disabled="reviewSubmitting" @click="submitReview">{{ reviewSubmitting ? '提交中…' : '提交批改' }}</button>
                    <button class="btn btn-ghost" :disabled="reviewSubmitting" @click="returnReview">退回修改</button>
                  </div>
                  <p v-if="reviewActionResult" style="margin-top:8px;font-size:13px;color:var(--success)">{{ reviewActionResult }}</p>
                </section>
                <section v-else class="paper review-pane" style="display:grid;place-items:center;color:var(--muted)">
                  <p>选择左侧一份作业开始批改。</p>
                </section>
              </div>
            </section>

            <!-- 成绩分析 -->
            <section v-show="adminPage === 'a-stats'" class="view active" data-od-id="admin-stats">
              <div class="page-h">
                <div><h1>成绩与分析</h1><p>班级对比与作业得分分布（示意）。</p></div>
              </div>
              <div class="kpi-4">
                <div class="kpi"><div class="l">班级均分</div><div class="v num">{{ statsData.avgScore }}</div><div class="d">↑ 1.6</div></div>
                <div class="kpi"><div class="l">按时提交率</div><div class="v num">{{ statsData.onTimeRate }}%</div><div class="d">稳定</div></div>
                <div class="kpi"><div class="l">重交率</div><div class="v num">{{ statsData.resubmitRate }}%</div><div class="d w">关注话术课</div></div>
                <div class="kpi"><div class="l">优秀作业</div><div class="v num">{{ statsData.excellentCount }}</div><div class="d">可作范例</div></div>
              </div>
              <div class="two">
                <section class="paper">
                  <h3>近 6 周均分 <span class="m">电商 1 班</span></h3>
                  <div class="chart-bars" data-od-id="score-chart">
                    <div v-for="(h, i) in scoreChartHeights" :key="i" class="col">
                      <i :style="{ height: h + '%' }"></i>
                      <span>W{{ i + 1 }}</span>
                    </div>
                  </div>
                </section>
                <section class="paper">
                  <h3>作业得分分布</h3>
                  <div class="prog"><div class="name" style="grid-column:1/-1">90–100<div class="track"><i style="width:28%"></i></div></div></div>
                  <div class="prog"><div class="name" style="grid-column:1/-1">80–89<div class="track"><i style="width:46%"></i></div></div></div>
                  <div class="prog"><div class="name" style="grid-column:1/-1">70–79<div class="track"><i style="width:18%"></i></div></div></div>
                  <div class="prog"><div class="name" style="grid-column:1/-1">70 以下<div class="track"><i style="width:8%;background:var(--warn)"></i></div></div></div>
                </section>
              </div>
              <!-- 排行榜 -->
              <section class="paper" style="margin-top:16px">
                <h3>学员排行榜 <span class="m">按均分</span></h3>
                <div v-if="analyticsRanking.length" class="table-wrap" style="margin-top:12px">
                  <table class="data"><thead><tr><th>#</th><th>学员</th><th>评分次数</th><th>均分</th></tr></thead><tbody>
                    <tr v-for="(r,i) in analyticsRanking.slice(0,10)" :key="i">
                      <td class="num" style="font-weight:700">{{ i+1 }}</td>
                      <td>{{ r.learnerLabel || '学员' }}</td>
                      <td class="num">{{ r.gradedCount }}</td>
                      <td class="num"><b>{{ r.avgScore?.toFixed(1) || '—' }}</b></td>
                    </tr>
                  </tbody></table>
                </div>
                <p v-else style="color:var(--muted);font-size:13px;padding:12px 0">暂无评分数据。</p>
              </section>
            </section>
          </div>
        </div>
      </div>

      <!-- 遮罩层（关闭下拉菜单） -->
      <div v-if="showNotifications || showProfile" class="topbar-backdrop" @click="closeMenus"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import type { Plan, PracticumRole } from '~/domain/practicum/types'

// ============ Composables ============
const auth = useAuthSession()
const server = usePracticumServer()
const store = usePracticumStore()
const workspace = useWorkspaceContext()
const router = useRouter()

// ============ State ============
const pageLoading = ref(true)
const studentPage = ref('home')
const adminPage = ref('a-dash')
const centerNav = ref('overview')
const showNotifications = ref(false)
const showProfile = ref(false)
const roleSwitching = ref(false)
const unreadCount = ref(0)
const notifications = ref<any[]>([])
const allPlans = ref<Plan[]>([])
const serverProgress = ref<any>(null)
const studentTasks = ref<any[]>([])
const reviewQueue = ref<any[]>([])
const roomMembers = ref<any[]>([])
const memberCount = ref<number | null>(null)

// Student home
const planProgress = ref({ completed: 0, total: 0, percent: 0 })

// Course filters
const courseSearchQuery = ref('')
const courseSort = ref('recommended')
const courseCategories = ref<string[]>(['all'])
const courseLevels = ref<string[]>(['all'])
const courseTypes = ref<string[]>([])

// Learning page
const learnMode = ref<'course'|'cases'>('course')
const currentLessonIndex = ref(0)
const videoPlaying = ref(false)
const taskSubmitted = ref(false)
const learnStatusMsg = ref('')
const selectedLearningPlan = ref<Plan | null>(null)

// Admin
const adminCourseTab = ref<'plans'|'templates'|'competitions'>('plans')
const memberSearchQuery = ref('')
const selectedReviewIdx = ref(-1)
const reviewScore = ref('')
const reviewFeedback = ref('')
const reviewSubmitting = ref(false)
const reviewActionResult = ref('')

// P0: 模拟店铺
const shopProducts = ref<any[]>([])
const shopFreightTemplates = ref<any[]>([])
const shopTab = ref<'products'|'freight'>('products')
const shopLoading = ref(false)

// P0: 教学案例
const commerceCases = ref<any[]>([])
const selectedCase = ref<any>(null)
const caseAnswer = ref('')
const caseSubmitting = ref(false)
const caseResult = ref('')

// P1: 成就系统
const achievementBadges = ref<any[]>([])
const achievementSkills = ref<any[]>([])
const achievementTimeline = ref<any[]>([])

// P2: 教程库
const tutorials = ref<any[]>([])

// P2: 模板与竞赛
const templates = ref<any[]>([])
const competitions = ref<any[]>([])

// P2: 数据中心增强
const analyticsOverview = ref<any>(null)
const analyticsRanking = ref<any[]>([])
const analyticsActivityFeed = ref<any[]>([])

// ============ Computed ============
const activeRole = computed(() => auth.state.value.user?.role ?? store.state.activeRole)
const isAdmin = computed(() => ['OWNER', 'TEACHER', 'MENTOR'].includes(activeRole.value ?? ''))
const isOwner = computed(() => activeRole.value === 'OWNER')
const displayName = computed(() => auth.state.value.user?.displayName || (isAdmin.value ? '老师' : '同学'))
const avatarText = computed(() => displayName.value.trim().slice(0, 1) || 'L')
const authorizedRoles = computed(() => auth.state.value.user?.authorizedRoles ?? (activeRole.value ? [activeRole.value] : []))
const roleLabels: Record<string, string> = { OWNER: '管理员', TEACHER: '教师', MENTOR: '导师', STUDENT: '学生' }
const roleLabel = computed(() => activeRole.value ? roleLabels[activeRole.value] : '未登录')
const workspaceDescription = computed(() => {
  const org = workspace.state.value.organization?.name
  const room = workspace.state.value.room?.title
  return org && room ? `${org} · ${room}` : '数字商贸实训工作台'
})

const publishedPlans = computed(() => allPlans.value.filter(p => p.status === 'PUBLISHED'))
const primaryPlanTitle = computed(() => publishedPlans.value[0]?.title || '等待课程发布')
const primaryPlan = computed(() => publishedPlans.value[0] ?? null)
const primaryLearningRoute = computed(() => primaryPlan.value ? `/practicum/learn/${primaryPlan.value.id}` : '/practicum/courses')

const pendingTaskCount = computed(() => studentTasks.value.filter((t: any) => !['SUBMITTED', 'GRADED'].includes(t.status)).length)
const nextTaskLabel = computed(() => {
  const t = studentTasks.value.find((t: any) => !['SUBMITTED', 'GRADED'].includes(t.status))
  return t ? `${t.activity?.title || '任务'} · 待完成` : '暂无待处理任务'
})
const remainingTasks = computed(() => Math.max((planProgress.value.total || 3) - (planProgress.value.completed || 1), 0))

const recentNotifications = computed(() => notifications.value.filter((n: any) => n.targetRole === activeRole.value).slice(0, 5))

const progressPlans = computed(() => {
  if (serverProgress.value?.plans) {
    return serverProgress.value.plans.map((p: any) => ({
      id: p.id,
      title: p.title,
      percent: p.percent || 0,
    }))
  }
  return []
})

const studentTaskItems = computed(() => {
  return studentTasks.value.slice(0, 5).map((t: any) => ({
    id: t.id,
    title: t.activity?.title || '任务',
    subtitle: t.source?.title || '',
    pillClass: t.status === 'SUBMITTED' ? 'pill-warn' : t.status === 'GRADED' ? 'pill-ok' : 'pill-info',
    statusLabel: t.status === 'SUBMITTED' ? '待批' : t.status === 'GRADED' ? '已评分' : '进行中',
  }))
})

const currentLessons = computed(() => {
  const planTitle = selectedLearningPlan.value?.title || '从零开始做电商'
  return [
    { title: '选品基础', done: false },
    { title: '认识类目机会', done: true },
    { title: '建立选品表', done: false },
    { title: '实操任务', done: false },
  ]
})
const currentLessonTitle = computed(() => currentLessons.value[currentLessonIndex.value]?.title || '从零开始做电商')
const currentLessonSubtitle = computed(() => `第 1 单元 · 约 ${currentLessonIndex.value === 0 ? 12 : currentLessonIndex.value === 1 ? 8 : currentLessonIndex.value === 2 ? 15 : 0} 分钟`)

const filteredCourses = computed(() => {
  let plans = [...allPlans.value].filter(p => p.status === 'PUBLISHED')
  const q = courseSearchQuery.value.toLowerCase()
  if (q) plans = plans.filter(p => `${p.title} ${p.description || ''}`.toLowerCase().includes(q))
  if (!courseCategories.value.includes('all') && courseCategories.value.length) {
    plans = plans.filter(p => courseCategories.value.some(c => categoryLabel(p).includes(c)))
  }
  if (courseSort.value === 'name') plans.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  return plans
})

const pendingReviewCount = computed(() => reviewQueue.value.filter((r: any) => r.status === 'SUBMITTED').length)
const selectedReview = computed(() => {
  if (selectedReviewIdx.value >= 0 && selectedReviewIdx.value < reviewQueue.value.length) {
    return reviewQueue.value[selectedReviewIdx.value]
  }
  return null
})

const adminKpis = computed(() => ({
  activeLearners: memberCount.value ?? 248,
  pendingReviews: pendingReviewCount.value || 18,
  weeklySubmissions: reviewQueue.value.length + 68,
  avgCompletion: publishedPlans.value.length ? Math.round(publishedPlans.value.reduce((s: number, _: any) => s + 60 + Math.random() * 30, 0) / publishedPlans.value.length) : 72,
}))

const adminPlanProgress = computed(() => {
  if (serverProgress.value?.plans) {
    return serverProgress.value.plans.slice(0, 3).map((p: any) => ({
      id: p.id,
      title: p.title,
      percent: p.percent || 0,
    }))
  }
  return allPlans.value.filter(p => p.status === 'PUBLISHED').slice(0, 3).map(p => ({
    id: p.id,
    title: p.title,
    percent: Math.floor(40 + Math.random() * 45),
  }))
})

const filteredMembers = computed(() => {
  let members = roomMembers.value
  if (memberSearchQuery.value) {
    const q = memberSearchQuery.value.toLowerCase()
    members = members.filter((m: any) => m.label.toLowerCase().includes(q))
  }
  return members.map((m: any) => ({
    ...m,
    progress: m.progress ?? Math.floor(30 + Math.random() * 70),
    pending: m.pending ?? Math.floor(Math.random() * 3),
    lastActive: m.lastActive ?? ['今天 14:20', '今天 11:05', '3 天前', '5 天前', '昨天 21:10'][Math.floor(Math.random() * 5)],
    status: (m.progress ?? 0) > 60 ? '正常' : (m.progress ?? 0) > 30 ? '滞后' : '风险',
  }))
})

const statsData = computed(() => ({
  avgScore: '84.2',
  onTimeRate: 91,
  resubmitRate: 14,
  excellentCount: 23,
}))

const scoreChartHeights = [72, 78, 74, 81, 86, 84]

const primaryActionLabel = computed(() => {
  if (isOwner.value) return '计划管理'
  if (activeRole.value === 'TEACHER' || activeRole.value === 'MENTOR') return '我的班级'
  return primaryPlan.value ? '继续学习' : '浏览课程'
})

const bannerColors = ['banner-orange', 'banner-blue', 'banner-green', 'banner-purple']
const progressColors = ['#ff9d45', '#4d8be5', '#35ad87', '#8671e6']
const weekDays = ['一', '二', '三', '四', '五', '六', '日']
const currentMonth = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1} / ${d.getFullYear()}`
})
const calendarDays = computed(() => {
  const now = new Date()
  const today = now.getDate()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const highlightDays = [7, 14, 20, 27]
  const days: { label: string; highlight: boolean; today: boolean }[] = []
  for (let i = 0; i < 35; i++) {
    const dayNum = i - firstDayOfMonth + 1
    days.push({
      label: dayNum >= 1 && dayNum <= 31 ? String(dayNum) : '',
      highlight: highlightDays.includes(i),
      today: dayNum === today,
    })
  }
  return days
})

// ============ Methods ============
function categoryLabel(plan: Plan) {
  const t = plan.title + (plan.description || '')
  if (t.includes('数据')) return '数据分析'
  if (t.includes('直播') || t.includes('营销') || t.includes('增长')) return '直播运营'
  return '店铺增长'
}

function statusLabel(s: string) {
  return s === 'PUBLISHED' ? '进行中' : s === 'ARCHIVED' ? '已归档' : '未开始'
}

function reviewStatusLabel(s: string) {
  return s === 'SUBMITTED' ? '待批' : s === 'RETURNED' ? '重交' : '已评分'
}

function planMemberCount(_plan: Plan) { return Math.floor(30 + Math.random() * 20) }
function planCompletionPercent(_plan: Plan) { return Math.floor(Math.random() * 100) }

function formatTime(v: string) {
  try { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)) }
  catch { return v }
}

function onFilterChange(group: string, value: string) {
  if (value === 'all') {
    if (group === 'category') courseCategories.value = ['all']
    else if (group === 'level') courseLevels.value = ['all']
  }
  applyCourseFilters()
}

function applyCourseFilters() { /* reactivity handles this */ }

async function switchToStudent() {
  if (isAdmin.value) await handleRoleChange('STUDENT')
}

async function switchToAdmin() {
  if (!isAdmin.value) {
    const adminRole = authorizedRoles.value.find((r: string) => ['OWNER', 'TEACHER', 'MENTOR'].includes(r))
    if (adminRole) await handleRoleChange(adminRole)
  }
}

async function handleRoleChange(role: string) {
  if (roleSwitching.value || role === activeRole.value) return
  roleSwitching.value = true
  try {
    const user = await auth.switchRole(role as PracticumRole)
    store.switchRole(user.role)
    await workspace.load()
    await loadAllData()
  } finally {
    roleSwitching.value = false
  }
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  showProfile.value = false
}

function toggleProfile() {
  showProfile.value = !showProfile.value
  showNotifications.value = false
}

function closeMenus() {
  showNotifications.value = false
  showProfile.value = false
}

async function markAllNotificationsRead() {
  const unread = notifications.value.filter((n: any) => !n.read)
  await Promise.allSettled(unread.map((n: any) => server.markNotificationRead(n.id)))
  notifications.value = notifications.value.map((n: any) => unread.some((u: any) => u.id === n.id) ? { ...n, read: true } : n)
  unreadCount.value = notifications.value.filter((n: any) => !n.read).length
}

function goNotification(n: any) {
  showNotifications.value = false
  if (!n.read) {
    server.markNotificationRead(n.id)
    n.read = true
    unreadCount.value = notifications.value.filter((x: any) => !x.read).length
  }
  if (n.targetRoute) navigateTo(n.targetRoute)
}

async function handleLogout() {
  closeMenus()
  await auth.logout()
  await router.push('/practicum/login')
}

function handlePrimaryAction() {
  if (isOwner.value) navigateTo('/practicum/plans')
  else if (activeRole.value === 'TEACHER' || activeRole.value === 'MENTOR') navigateTo('/practicum/classes')
  else if (primaryPlan.value) navigateTo(`/practicum/learn/${primaryPlan.value.id}`)
  else studentPage.value = 'courses'
}

function navigateTo(path: string) {
  // Use client-side routing for internal pages — instant navigation
  if (path.startsWith('/')) {
    router.push(path)
  } else {
    window.location.href = path
  }
}

function openPlanInLearn(plan: Plan) {
  selectedLearningPlan.value = plan
  studentPage.value = 'learn'
  learnStatusMsg.value = `已打开《${plan.title}》，可从第一个章节开始学习。`
}

function selectLesson(index: number) {
  currentLessonIndex.value = index
  videoPlaying.value = false
  learnStatusMsg.value = `已切换至"${currentLessons.value[index].title}"。`
}

function toggleVideo() {
  videoPlaying.value = !videoPlaying.value
}

function submitTask() {
  taskSubmitted.value = true
  learnStatusMsg.value = '作业已提交，导师将在批阅队列中查看。'
}

function saveDraft() {
  learnStatusMsg.value = '草稿已保存，可继续完善后再提交。'
}

function submitCase() {
  if (!selectedCase.value || !caseAnswer.value.trim() || caseSubmitting.value) return
  caseSubmitting.value = true
  caseResult.value = ''
  // Simulate submission
  setTimeout(() => {
    caseSubmitting.value = false
    caseResult.value = '案例作业已提交，教师将在批阅队列中查看。'
    caseAnswer.value = ''
  }, 800)
}

function selectReview(idx: number) {
  selectedReviewIdx.value = idx
  reviewScore.value = ''
  reviewFeedback.value = ''
  reviewActionResult.value = ''
}

async function submitReview() {
  if (!selectedReview.value || reviewSubmitting.value) return
  reviewSubmitting.value = true
  reviewActionResult.value = ''
  try {
    const score = Number(reviewScore.value) || 0
    const rubricScores: Record<string, number> = { overall: score }
    await server.gradeSubmission(selectedReview.value.submissionId, rubricScores, reviewFeedback.value || '已批阅。')
    reviewActionResult.value = '批改已提交成功！'
    await loadReviewQueue()
  } catch {
    reviewActionResult.value = '批改提交失败，请重试。'
  } finally {
    reviewSubmitting.value = false
  }
}

async function returnReview() {
  if (!selectedReview.value || reviewSubmitting.value) return
  reviewSubmitting.value = true
  reviewActionResult.value = ''
  try {
    await server.returnSubmission(selectedReview.value.submissionId, reviewFeedback.value || '请修改后重新提交。')
    reviewActionResult.value = '已退回修改。'
    await loadReviewQueue()
  } catch {
    reviewActionResult.value = '退回失败，请重试。'
  } finally {
    reviewSubmitting.value = false
  }
}

// ============ Data Loading ============
async function loadAllData() {
  const roomId = workspace.state.value.room?.id || store.state.room.id

  // Fire all API calls in parallel
  const isStudent = activeRole.value === 'STUDENT'
  const promises: Promise<void>[] = []

  // Plans — always needed
  promises.push((async () => {
    try {
      const res = await server.listPlans({
        status: isStudent ? 'PUBLISHED' : undefined,
        page: 1, pageSize: 50,
        sort: 'updatedAt', direction: 'desc',
      })
      allPlans.value = res.items
    } catch { allPlans.value = [] }
  })())

  // Student data — parallel
  if (isStudent) {
    promises.push((async () => {
      try { serverProgress.value = await server.getProgress(roomId, 'STUDENT') } catch { serverProgress.value = null }
      if (serverProgress.value?.plans?.[0]) {
        planProgress.value = {
          completed: serverProgress.value.plans[0].completed || 0,
          total: serverProgress.value.plans[0].total || 0,
          percent: serverProgress.value.plans[0].percent || 0,
        }
      }
    })())
    promises.push((async () => {
      try { const res = await server.listStudentTasks(); studentTasks.value = res.items } catch { studentTasks.value = [] }
    })())
  }

  // Admin data — parallel
  if (isAdmin.value) {
    promises.push((async () => {
      try { reviewQueue.value = (await server.listSubmissions({ status: 'SUBMITTED', pageSize: 50 })).items } catch { reviewQueue.value = [] }
    })())
    promises.push((async () => {
      try { const res = await server.listRoomMembers(roomId); roomMembers.value = res.items; memberCount.value = res.total } catch { roomMembers.value = [] }
    })())
  }

  // P0: Shop data
  promises.push((async () => {
    try { shopProducts.value = (await server.listProducts()).items } catch { shopProducts.value = [] }
  })())
  promises.push((async () => {
    try { shopFreightTemplates.value = (await server.listFreightTemplates()).items } catch { shopFreightTemplates.value = [] }
  })())

  // P0: Commerce cases (seed data)
  promises.push((async () => {
    try { commerceCases.value = (await import('~/data/practicum/commerce-case-seed')).commerceCases } catch { commerceCases.value = [] }
  })())

  // P1: Achievements (seed data)
  promises.push((async () => {
    try {
      const mod = await import('~/data/practicum/achievement-catalog')
      achievementBadges.value = mod.achievementBadges
      achievementSkills.value = mod.skillMatrix
      achievementTimeline.value = mod.achievementTimeline
    } catch { achievementBadges.value = []; achievementSkills.value = []; achievementTimeline.value = [] }
  })())

  // P2: Tutorials (seed data)
  promises.push((async () => {
    try { tutorials.value = (await import('~/data/practicum/tutorial-catalog')).tutorialDocuments } catch { tutorials.value = [] }
  })())

  // P2: Templates & Competitions
  promises.push((async () => {
    try { templates.value = (await server.listTemplates()).items } catch { templates.value = [] }
  })())
  promises.push((async () => {
    try { competitions.value = (await server.listCompetitions()).items } catch { competitions.value = [] }
  })())

  // P2: Analytics (admin only)
  if (isAdmin.value) {
    promises.push((async () => {
      try {
        analyticsOverview.value = await server.getRoomOverview(roomId)
        const ranking = await server.listMemberAchievementAnalytics(roomId)
        analyticsRanking.value = ranking.items || []
      } catch { analyticsOverview.value = null; analyticsRanking.value = [] }
    })())
  }

  // Notifications — also parallel
  promises.push((async () => {
    try {
      const res = await server.listNotifications()
      notifications.value = res.items
      unreadCount.value = res.unread || res.items.filter((n: any) => !n.read).length
    } catch { notifications.value = [] }
  })())

  // Wait for all parallel requests to complete
  await Promise.all(promises)

  // Post-load: set selected learning plan
  if (isStudent && publishedPlans.value[0] && !selectedLearningPlan.value) {
    selectedLearningPlan.value = publishedPlans.value[0]
  }
}

async function loadReviewQueue() {
  try {
    reviewQueue.value = (await server.listSubmissions({ status: 'SUBMITTED', pageSize: 50 })).items
  } catch { /* keep existing */ }
}

// ============ Init ============
onMounted(async () => {
  pageLoading.value = true
  const user = await auth.load()
  if (!user) {
    await router.replace('/practicum/login')
    return
  }
  store.switchRole(user.role)
  await workspace.load()
  if (activeRole.value === 'STUDENT' && publishedPlans.value[0]) {
    selectedLearningPlan.value = publishedPlans.value[0]
  }
  await loadAllData()
  pageLoading.value = false

  // Load Lucide icons
  if (typeof window !== 'undefined' && (window as any).lucide) {
    await nextTick()
    ;(window as any).lucide.createIcons()
  }
})

watch([studentPage, adminPage, showNotifications, showProfile], async () => {
  await nextTick()
  if (typeof window !== 'undefined' && (window as any).lucide) {
    ;(window as any).lucide.createIcons()
  }
})
</script>

<style>
/* ===== 设计稿 CSS — 方案 A 轻蓝工作台 ===== */
:root{
  --bg: oklch(99% 0.002 240);
  --surface: #fff;
  --fg: oklch(18% 0.012 250);
  --muted: oklch(50% 0.012 250);
  --border: oklch(91% 0.006 250);
  --accent: #147bd1;
  --accent-deep: #0f65ae;
  --accent-soft: oklch(96% 0.022 240);
  --success:#16a34a; --warn:#d97706; --danger:#dc2626;
  --c-orange:#ff9d45; --c-blue:#4d8be5; --c-green:#35ad87; --c-purple:#8671e6;
  --font-display:-apple-system,BlinkMacSystemFont,'SF Pro Display','Noto Sans SC',system-ui,sans-serif;
  --font-body:-apple-system,BlinkMacSystemFont,'SF Pro Text','Noto Sans SC',system-ui,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,Menlo,monospace;
  --max: none;
  --wrap-padding: clamp(8px, 1vw, 20px);
  --sidebar-w: 170px;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--fg);font:15px/1.6 var(--font-body);-webkit-font-smoothing:antialiased}
button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
h1,h2,h3{font-family:var(--font-display);letter-spacing:-0.025em;font-weight:700}
.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
a{color:inherit}

/* 顶栏 */
.top{position:sticky;top:0;z-index:40;height:56px;display:flex;align-items:center;gap:20px;padding:0 var(--wrap-padding);
  background:color-mix(in oklab,var(--surface) 88%,transparent);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--border)}
.logo{display:flex;align-items:center;gap:10px;font:700 16px/1 var(--font-display);letter-spacing:-0.02em;flex:none;text-decoration:none;color:inherit}
.logo b{width:28px;height:28px;border-radius:8px;background:var(--accent);color:#fff;display:grid;place-items:center;
  font:700 14px var(--font-mono);box-shadow:0 2px 6px rgba(20,123,209,.3)}
.tabs{display:flex;height:100%;gap:4px;flex:1}
.tabs button{position:relative;height:100%;padding:0 16px;color:var(--muted);font:500 14px var(--font-body)}
.tabs button:hover{color:var(--fg)}
.tabs button.active{color:var(--fg);font-weight:600}
.tabs button.active:after{content:'';position:absolute;left:16px;right:16px;bottom:0;height:2px;background:var(--accent);border-radius:2px}
.top-right{display:flex;align-items:center;gap:12px;flex:none;position:relative}
.role{display:flex;padding:3px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
.role button{padding:6px 12px;border-radius:8px;font:500 12px var(--font-body);color:var(--muted)}
.role button.on{background:var(--fg);color:#fff;font-weight:600}
.bell{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--border);border-radius:10px;color:var(--muted);position:relative}
.bell.has-unread:after{content:'';position:absolute;top:9px;right:10px;width:7px;height:7px;border-radius:50%;background:var(--danger);border:2px solid #fff}
.notification-badge{position:absolute;top:-4px;right:-4px;background:var(--danger);color:#fff;font:600 10px var(--font-mono);padding:1px 5px;border-radius:999px;min-width:16px;text-align:center}
.avatar{width:36px;height:36px;border-radius:50%;background:oklch(30% 0.03 250);color:#fff;display:grid;place-items:center;font:600 13px var(--font-body);cursor:pointer}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 20px;border-radius:10px;font:600 14px var(--font-body)}
.btn-primary{background:var(--accent);color:#fff;box-shadow:0 1px 2px rgba(16,24,40,.12),inset 0 1px 0 rgba(255,255,255,.15)}
.btn-primary:hover{background:var(--accent-deep)}
.btn-primary:disabled{opacity:.55;cursor:not-allowed}
.btn-ghost{background:var(--surface);border:1px solid var(--border);color:var(--fg)}
.btn-ghost:hover{border-color:oklch(82% 0.01 250)}
.btn-sm{height:34px;padding:0 14px;font-size:13px;border-radius:8px}
.btn-lg{height:48px;padding:0 28px;font-size:15px;border-radius:12px}

/* 下拉菜单 */
.topbar-dropdown{position:absolute;top:52px;right:0;width:320px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 16px 40px rgba(16,24,40,.18);z-index:50;overflow:hidden}
.dropdown-header{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 20px 12px;border-bottom:1px solid var(--border)}
.dropdown-header strong{display:block;font-size:14px}
.dropdown-header span{font-size:12px;color:var(--muted)}
.dropdown-list{list-style:none;max-height:280px;overflow-y:auto}
.dropdown-link{display:flex;align-items:center;gap:12px;padding:12px 20px;text-decoration:none;color:inherit;font-size:13px;width:100%;text-align:left;border:0;background:none;cursor:pointer}
.dropdown-link:hover{background:var(--bg)}
.dropdown-icon{width:20px;height:20px;display:grid;place-items:center;color:var(--muted);flex:none}
.dropdown-copy strong{display:block;font-size:13px}
.dropdown-copy span{font-size:11px;color:var(--muted)}
.dropdown-empty{padding:24px;text-align:center;color:var(--muted);font-size:13px}
.dropdown-footer{padding:12px 20px;border-top:1px solid var(--border)}
.dropdown-button:disabled{opacity:.45;cursor:default}
.role-chip{font:600 10px var(--font-mono);padding:3px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent-deep)}
.profile-role-options{border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:4px 0;margin:4px 0}
.topbar-backdrop{position:fixed;inset:0;z-index:39}

.shell-s,.shell-a{display:none}
.shell-s.on,.shell-a.on{display:block}
.view{display:none}
.view.active{display:block}
.wrap{max-width:var(--max);margin:0 auto;padding:0 var(--wrap-padding)}

/* 学员首页 */
.hero{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;padding:80px 0 64px}
.eyebrow{font:600 12px var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.hero h1{margin:18px 0 20px;font-size:clamp(36px,4.2vw,52px);line-height:1.12;letter-spacing:-0.03em}
.hero .lede{max-width:28em;font-size:17px;line-height:1.7;color:var(--muted)}
.hero-cta{display:flex;gap:14px;margin-top:32px}
.hero-scene{position:relative;border-radius:20px;overflow:hidden;aspect-ratio:5/4;
  box-shadow:0 32px 64px -28px rgba(16,24,40,.28)}
.hero-scene img{width:100%;height:100%;object-fit:cover;display:block}
.hero-badge{position:absolute;left:20px;bottom:20px;padding:12px 16px;border-radius:12px;
  background:rgba(255,255,255,.94);backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(16,24,40,.12);
  font:500 13px var(--font-body);display:flex;align-items:center;gap:10px}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--success)}

.resume{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-bottom:72px}
.resume-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 32px;
  display:flex;align-items:center;justify-content:space-between;gap:24px}
.resume-card h3{font-size:18px;margin:6px 0 8px}
.resume-card p{font-size:14px;color:var(--muted)}
.resume-card .lbl{font:600 11px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.track{height:6px;border-radius:99px;background:var(--bg);overflow:hidden;margin-top:14px;max-width:280px}
.track i{display:block;height:100%;background:var(--accent);border-radius:99px}

.section{padding:0 0 80px}
.section-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:28px;gap:24px}
.section-head h2{font-size:28px;letter-spacing:-0.02em}
.section-head p{color:var(--muted);font-size:14px;margin-top:6px}
.link{font:500 14px var(--font-body);color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:2px}
.link:hover{border-color:var(--fg)}

.paths{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:64px}
.path{padding:28px;border:1px solid var(--border);border-radius:16px;background:var(--surface);transition:border-color .15s,transform .15s;cursor:pointer}
.path:hover{border-color:color-mix(in oklab,var(--accent) 35%,var(--border));transform:translateY(-2px)}
.path .n{font:600 12px var(--font-mono);color:var(--accent);letter-spacing:.08em}
.path h3{font-size:20px;margin:14px 0 8px}
.path span{font-size:14px;color:var(--muted)}

.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.course-card{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--surface);
  transition:transform .18s,box-shadow .18s;cursor:pointer}
.course-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px -24px rgba(16,24,40,.22)}
.course-banner{height:120px;padding:20px 22px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.course-banner:after{content:'';position:absolute;right:-40px;top:-40px;width:140px;height:140px;border-radius:40px;background:rgba(255,255,255,.15);transform:rotate(18deg)}
.course-banner .cat{font:600 11px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;opacity:.9}
.course-banner h3{position:relative;z-index:1;font-size:22px;letter-spacing:-0.02em}
.banner-orange{background:var(--c-orange)}.banner-blue{background:var(--c-blue)}
.banner-green{background:var(--c-green)}.banner-purple{background:var(--c-purple)}
.course-body{padding:20px 22px 22px}
.course-body b{font-size:14px;font-weight:600}
.course-body span{display:block;margin-top:6px;color:var(--muted);font-size:13px}
.course-meta{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding-top:16px;border-top:1px solid var(--border)}
.stars{color:#e8a838;letter-spacing:2px;font-size:12px}
.tag{font:500 12px var(--font-body);color:var(--accent-deep);background:var(--accent-soft);padding:4px 10px;border-radius:999px}

.foot{border-top:1px solid var(--border);padding:28px var(--wrap-padding);display:flex;justify-content:space-between;color:var(--muted);font-size:13px}

/* 课程大厅 */
.hall{display:grid;grid-template-columns:170px 1fr;min-height:calc(100vh - 56px)}
.filters{padding:40px 28px;border-right:1px solid var(--border);background:var(--surface)}
.filters h4{font:600 11px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:28px 0 14px}
.filters h4:first-child{margin-top:0}
.filter{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:14px;cursor:pointer;color:var(--fg)}
.filter input{accent-color:var(--accent);width:15px;height:15px}
.hall-main{padding:40px var(--wrap-padding)}
.hall-tools{display:flex;gap:12px;margin-bottom:28px}
.search{flex:0 1 320px;height:44px;padding:0 16px;border:1px solid var(--border);border-radius:10px;background:var(--surface);font:14px var(--font-body)}
.search:focus{outline:2px solid color-mix(in oklab,var(--accent) 28%,transparent);border-color:var(--accent)}
.select{height:44px;padding:0 16px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--muted);font:500 14px var(--font-body)}
.hall-main .cards{grid-template-columns:repeat(3,1fr)}
.hall-main .course-banner{height:100px}
.hall-main .course-banner h3{font-size:18px}
.course-empty{grid-column:1/-1;padding:36px;border:1px dashed var(--border);border-radius:16px;color:var(--muted);text-align:center}
.course-result{margin:-12px 0 20px;color:var(--muted);font-size:13px}

/* 学员中心 */
.dash{display:grid;grid-template-columns:170px 1fr;min-height:calc(100vh - 56px)}
.side{padding:28px 16px;border-right:1px solid var(--border);background:var(--surface)}
.side button{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:10px;color:var(--muted);font:500 14px var(--font-body);text-align:left}
.side button i{width:18px;height:18px}
.side button:hover{background:var(--bg);color:var(--fg)}
.side button.active{background:var(--accent-soft);color:var(--accent-deep);font-weight:600}
.dash-main{padding:20px var(--wrap-padding);max-width:none}
.welcome{padding:36px 40px;border-radius:20px;border:1px solid var(--border);
  background:linear-gradient(165deg,oklch(97% 0.015 240),var(--surface) 60%);
  display:flex;justify-content:space-between;align-items:center;gap:32px;margin-bottom:28px}
.welcome h1{font-size:32px;letter-spacing:-0.025em}
.welcome p{margin-top:10px;font-size:15px;color:var(--muted)}
.welcome p b{color:var(--fg)}
.medals{display:flex;gap:12px}
.medal{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;border:3px solid #fff;
  box-shadow:0 4px 12px rgba(0,0,0,.08)}
.medal.g{background:radial-gradient(circle at 30% 28%,#ffe9a8,#f0b93c);color:#8a5a00}
.medal.s{background:radial-gradient(circle at 30% 28%,#f0f4f8,#b9c6d2);color:#4a5568}
.medal.b{background:radial-gradient(circle at 30% 28%,#f6d3ae,#cd8d4e);color:#6b3e18}
.medal i{width:22px;height:22px}

.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
.stat{padding:24px 28px;background:var(--surface);border:1px solid var(--border);border-radius:16px}
.stat .l{font-size:13px;color:var(--muted)}
.stat .v{font:700 32px/1.15 var(--font-mono);letter-spacing:-0.03em;margin-top:8px}

.two{display:grid;grid-template-columns:1.25fr .85fr;gap:16px}
.paper{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px}
.paper h3{font-size:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
.paper h3 .m{font:500 13px var(--font-body);color:var(--muted);font-weight:500}
.prog{display:grid;grid-template-columns:48px 1fr 48px;gap:14px;align-items:center;padding:16px 0;border-top:1px solid var(--border)}
.prog:first-of-type{border-top:0;padding-top:0}
.thumb{width:48px;height:36px;border-radius:8px}
.prog .name{font-size:14px;font-weight:500}
.prog .track{margin-top:8px;max-width:none}
.prog .pct{text-align:right;font:600 14px var(--font-mono)}
.entry{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-top:1px solid var(--border);gap:16px}
.entry:first-of-type{border-top:0;padding-top:0}
.entry b{font-size:14px;display:block}
.entry span{font-size:13px;color:var(--muted)}
.pill{display:inline-flex;padding:4px 10px;border-radius:999px;font:500 12px var(--font-body)}
.pill-ok{background:oklch(96% 0.03 150);color:var(--success)}
.pill-warn{background:oklch(97% 0.035 80);color:var(--warn)}
.pill-info{background:var(--accent-soft);color:var(--accent-deep)}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center}
.cal .wd{font:600 11px var(--font-mono);color:var(--muted);padding:6px 0}
.cal b{padding:10px 0;border-radius:8px;background:var(--bg);font:500 12px var(--font-mono)}
.cal b.hl{background:var(--accent-soft);color:var(--accent-deep)}
.cal b.td{background:var(--accent);color:#fff}
.remind{margin-top:24px;padding:18px;border-radius:12px;background:var(--bg);border:1px solid var(--border)}
.remind .when{font:600 12px var(--font-mono);color:var(--accent);letter-spacing:.04em}
.remind b{display:block;margin-top:8px;font-size:15px}
.remind p{margin-top:4px;font-size:13px;color:var(--muted)}

/* 学习页 */
.learn{display:grid;grid-template-columns:200px minmax(0,1fr) 280px;min-height:calc(100vh - 56px)}
.outline{padding:24px 16px;border-right:1px solid var(--border);background:var(--surface)}
.outline h4{font:600 11px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:20px 10px 8px}
.outline h4:first-child{margin-top:0}
.outline div{padding:8px 10px;border-radius:10px;font-size:13px;color:var(--muted);display:flex;gap:8px;align-items:center;cursor:pointer}
.outline div i{width:14px;height:14px;flex:none}
.outline div.active{background:var(--accent-soft);color:var(--accent-deep);font-weight:600}
.outline div.done{color:var(--success)}
.lesson{padding:32px var(--wrap-padding);max-width:none}
.lesson h1{font-size:32px;letter-spacing:-0.025em}
.lesson .sub{margin:10px 0 28px;color:var(--muted);font-size:14px}
.video{position:relative;border-radius:16px;overflow:hidden;background:#0c1218;aspect-ratio:16/9}
.video img{width:100%;height:100%;object-fit:cover;opacity:.8;display:block}
.video .play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:50%;
  background:rgba(255,255,255,.95);color:var(--accent);display:grid;place-items:center;box-shadow:0 12px 32px rgba(0,0,0,.35);cursor:pointer}
.video .play:hover{transform:translate(-50%,-50%) scale(1.05)}
.video .play i{width:28px;height:28px;margin-left:3px}
.video.playing .play{opacity:0;transform:translate(-50%,-50%) scale(.92)}
.video.playing:hover .play,.video.playing .play:focus-visible{opacity:1;transform:translate(-50%,-50%) scale(1)}
.video-bar{position:absolute;left:0;right:0;bottom:0;padding:14px 18px;display:flex;align-items:center;gap:12px;
  background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;font:12px var(--font-mono)}
.video-bar .rail{flex:1;height:3px;border-radius:99px;background:rgba(255,255,255,.25)}
.video-bar .rail i{display:block;width:32%;height:100%;background:#fff;border-radius:99px}
.task-box{margin-top:28px;padding:28px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
.task-box h3{font-size:17px;margin-bottom:10px}
.task-box p{color:var(--muted);font-size:14px;line-height:1.7;margin-bottom:20px}
.task-box .actions{display:flex;gap:10px;flex-wrap:wrap}
.learn-status{min-height:22px;margin-top:14px;color:var(--muted);font-size:13px}
.drawer{padding:32px 24px;border-left:1px solid var(--border);background:var(--surface)}
.drawer h3{font-size:16px;margin-bottom:20px}
.teacher{display:flex;gap:14px;padding-bottom:20px;border-bottom:1px solid var(--border);margin-bottom:8px}
.teacher img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.teacher b{font-size:14px}
.teacher p{margin-top:4px;font-size:13px;color:var(--muted);line-height:1.55}
.comment{padding:16px 0;border-bottom:1px solid var(--border)}
.comment b{font-size:13px}
.comment p{margin-top:6px;font-size:13px;color:var(--muted);line-height:1.6}

/* 管理端 */
.admin{display:grid;grid-template-columns:170px 1fr;min-height:calc(100vh - 56px)}
.admin-side{padding:24px 12px;border-right:1px solid var(--border);background:var(--surface)}
.admin-side .lbl{font:600 11px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:0 12px;margin:0 0 10px}
.admin-side button{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:10px;color:var(--muted);font:500 14px var(--font-body);text-align:left;margin-bottom:2px}
.admin-side button i{width:18px;height:18px}
.admin-side button:hover{background:var(--bg);color:var(--fg)}
.admin-side button.active{background:var(--accent-soft);color:var(--accent-deep);font-weight:600}
.admin-side button .badge{margin-left:auto;font:600 11px var(--font-mono);background:var(--danger);color:#fff;padding:2px 7px;border-radius:999px}
.admin-main{padding:24px var(--wrap-padding) 48px;max-width:none}
.admin-main > .page-h{margin-bottom:32px;display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
.admin-main > .page-h h1{font-size:32px;letter-spacing:-0.025em}
.admin-main > .page-h p{margin-top:8px;color:var(--muted);font-size:15px}

.kpi-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.kpi{padding:24px 26px;background:var(--surface);border:1px solid var(--border);border-radius:16px}
.kpi .l{font-size:13px;color:var(--muted)}
.kpi .v{font:700 30px/1.15 var(--font-mono);letter-spacing:-0.03em;margin-top:10px}
.kpi .d{font:500 12px var(--font-mono);margin-top:8px;color:var(--success)}
.kpi .d.w{color:var(--warn)}

.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden}
table.data{width:100%;border-collapse:collapse;font-size:14px}
table.data th{text-align:left;padding:14px 20px;font:600 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--bg);border-bottom:1px solid var(--border)}
table.data td{padding:16px 20px;border-bottom:1px solid var(--border);vertical-align:middle}
table.data tr:last-child td{border-bottom:0}
table.data tr:hover td{background:oklch(99% 0.004 240)}
table.data b{font-weight:600}

.review-grid{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start}
.review-list .item{padding:18px 20px;border-bottom:1px solid var(--border);cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:12px}
.review-list .item:hover,.review-list .item.on{background:var(--accent-soft)}
.review-list .item:last-child{border-bottom:0}
.review-pane{position:sticky;top:88px}
.score-in{width:100%;height:48px;border:1px solid var(--border);border-radius:10px;padding:0 14px;font:600 18px var(--font-mono);margin:12px 0}
.ta{width:100%;min-height:100px;border:1px solid var(--border);border-radius:10px;padding:12px 14px;font:14px var(--font-body);resize:vertical}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px}
.tags button{padding:6px 12px;border-radius:999px;border:1px solid var(--border);font-size:12px;color:var(--muted)}
.tags button:hover{border-color:var(--accent);color:var(--accent)}

.chart-bars{display:flex;align-items:flex-end;gap:12px;height:160px;padding-top:8px}
.chart-bars .col{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end}
.chart-bars .col i{width:100%;border-radius:6px 6px 0 0;background:var(--accent);min-height:4px}
.chart-bars .col span{font:500 11px var(--font-mono);color:var(--muted)}

@media(max-width:1100px){
  .hero,.resume,.two,.review-grid{grid-template-columns:1fr}
  .paths,.cards,.kpi-4,.stat-row{grid-template-columns:1fr 1fr}
  .learn{grid-template-columns:180px 1fr}
  .drawer{display:none}
  .top{padding:0 16px;gap:16px}
  .wrap,.hall-main,.dash-main,.admin-main,.lesson{padding-left:20px;padding-right:20px}
}
@media(max-width:720px){
  .tabs{overflow:auto}
  .hero{padding:48px 0 40px;gap:32px}
  .hero h1{font-size:32px}
  .hall,.dash,.admin,.learn{grid-template-columns:1fr}
  .filters,.side,.admin-side,.outline{display:none}
  .paths,.cards,.kpi-4,.stat-row{grid-template-columns:1fr}
  .resume-card{flex-direction:column;align-items:flex-start}
}
</style>
