const { regClass } = Laya;

type GameScreen = "home" | "mode" | "team" | "player" | "match" | "result" | "rank";
type MatchMode = "career" | "pk";
type ShotDifficulty = "easy" | "normal" | "hard";

interface PlayerData {
    name: string;
    role: string;
    tier: "Ace" | "Starter" | "Wildcard";
    power: number;
    accuracy: number;
    curve: number;
    description: string;
}

interface TeamData {
    name: string;
    code: string;
    colors: [string, string];
    rating: number;
    unlocked: boolean;
    difficulty: ShotDifficulty;
    players: PlayerData[];
}

interface ShotResult {
    isGoal: boolean;
    isSaved: boolean;
    isMiss: boolean;
    ballEndX: number;
    ballEndY: number;
    diveDirection: number;
    saveReach: number;
    keeperTargetX: number;
    keeperTargetY: number;
    quality: "perfect" | "good" | "normal" | "risky";
    powerFactor: number;
    angleFactor: number;
    message: string;
}

interface MatchSummary {
    title: string;
    subtitle: string;
    playerScore: number;
    enemyScore: number;
    totalShots: number;
    goals: number;
    accuracyRate: number;
    streak: number;
}

interface GameSaveData {
    unlockedTeams: string[];
    selectedTeamIndex: number;
    selectedPlayerIndex: number;
    settings: {
        sound: boolean;
        vibration: boolean;
    };
    topScore: number;
    totalWins: number;
}

@regClass("7bad1742-6eed-4d8d-81c0-501dc5bf03d6")
export class Main extends Laya.Script {
    private static bootstrapped = false;
    private static readonly saveKey = "dianqiu_wc_penalty_save_v1";
    private static readonly heroImage = "resources/hero_stadium.png";
    private static readonly pitchImage = "resources/pitch_texture.png";
    private static readonly shareCardImage = "resources/share_card.png";
    private static readonly ballImage = "resources/football.png";
    private readonly designWidth = 750;
    private readonly designHeight = 1334;
    private readonly totalRounds = 5;
    private readonly ui = {
        bg: null as Laya.Sprite | null,
        field: null as Laya.Sprite | null,
        overlay: null as Laya.Sprite | null,
        hud: null as Laya.Sprite | null,
        toast: null as Laya.Text | null
    };

    private readonly teamPool: TeamData[] = [
        {
            name: "阿根廷",
            code: "ARG",
            colors: ["#9fe0ff", "#ffffff"],
            rating: 95,
            unlocked: true,
            difficulty: "easy",
            players: [
                { name: "天空王牌", role: "王牌前锋", tier: "Ace", power: 93, accuracy: 95, curve: 89, description: "节奏稳定，打球门死角非常可靠。" },
                { name: "禁区猎手", role: "主力前锋", tier: "Starter", power: 88, accuracy: 90, curve: 82, description: "均衡型终结者，适合大多数射门路线。" },
                { name: "中场大脑", role: "主力中场", tier: "Starter", power: 80, accuracy: 91, curve: 86, description: "擅长稳稳推向角落，容错更高。" },
                { name: "替补重炮", role: "奇兵", tier: "Wildcard", power: 96, accuracy: 72, curve: 70, description: "力量极强，但稳定性稍低。" },
                { name: "弧线大师", role: "奇兵", tier: "Wildcard", power: 77, accuracy: 84, curve: 95, description: "斜向上滑动时收益最高。" }
            ]
        },
        {
            name: "法国",
            code: "FRA",
            colors: ["#203a8c", "#f4f7ff"],
            rating: 94,
            unlocked: true,
            difficulty: "normal",
            players: [
                { name: "蓝色闪电", role: "王牌前锋", tier: "Ace", power: 94, accuracy: 90, curve: 87, description: "爆发强，球速快，适合强力抽射。" },
                { name: "边路利刃", role: "主力前锋", tier: "Starter", power: 90, accuracy: 84, curve: 82, description: "出脚快，适合果断上滑。" },
                { name: "均衡核心", role: "主力中场", tier: "Starter", power: 82, accuracy: 92, curve: 80, description: "中路和角落都很稳。" },
                { name: "终场杀手", role: "奇兵", tier: "Wildcard", power: 89, accuracy: 78, curve: 88, description: "需要更精细控制，上限很高。" },
                { name: "旋转专家", role: "奇兵", tier: "Wildcard", power: 76, accuracy: 80, curve: 96, description: "擅长弧线绕向远角。" }
            ]
        },
        {
            name: "巴西",
            code: "BRA",
            colors: ["#ffe45c", "#1f9f4d"],
            rating: 93,
            unlocked: true,
            difficulty: "normal",
            players: [
                { name: "桑巴之星", role: "王牌前锋", tier: "Ace", power: 90, accuracy: 92, curve: 93, description: "脚法华丽，弧线能力顶级。" },
                { name: "舞步终结者", role: "主力前锋", tier: "Starter", power: 87, accuracy: 88, curve: 90, description: "斜线射门表现出色。" },
                { name: "节奏引擎", role: "主力中场", tier: "Starter", power: 80, accuracy: 90, curve: 88, description: "输出稳定，落点控制好。" },
                { name: "火箭脚", role: "奇兵", tier: "Wildcard", power: 95, accuracy: 70, curve: 83, description: "风险高，但爆发力惊人。" },
                { name: "低空弧线", role: "奇兵", tier: "Wildcard", power: 79, accuracy: 82, curve: 94, description: "适合绕开门将扑救。" }
            ]
        },
        {
            name: "德国",
            code: "GER",
            colors: ["#f6f6f6", "#212121"],
            rating: 91,
            unlocked: false,
            difficulty: "hard",
            players: [
                { name: "钢铁射门", role: "王牌前锋", tier: "Ace", power: 92, accuracy: 90, curve: 84, description: "直接、高效，终结能力强。" },
                { name: "压迫跑者", role: "主力前锋", tier: "Starter", power: 89, accuracy: 86, curve: 80, description: "力量优先，适合正面强攻。" },
                { name: "战术核心", role: "主力中场", tier: "Starter", power: 81, accuracy: 91, curve: 79, description: "更容易打出安全进球。" },
                { name: "关键替补", role: "奇兵", tier: "Wildcard", power: 94, accuracy: 73, curve: 76, description: "适合重炮路线。" },
                { name: "上角专家", role: "奇兵", tier: "Wildcard", power: 75, accuracy: 83, curve: 92, description: "瞄准两侧时更有威胁。" }
            ]
        },
        {
            name: "西班牙",
            code: "ESP",
            colors: ["#ff4b5c", "#ffd166"],
            rating: 90,
            unlocked: true,
            difficulty: "normal",
            players: [
                { name: "传控王牌", role: "王牌前锋", tier: "Ace", power: 88, accuracy: 93, curve: 90, description: "落点干净，出脚迅速。" },
                { name: "红翼前锋", role: "主力前锋", tier: "Starter", power: 84, accuracy: 90, curve: 85, description: "打角落很可靠。" },
                { name: "中场脉搏", role: "主力中场", tier: "Starter", power: 79, accuracy: 92, curve: 84, description: "控制优先，风险较低。" },
                { name: "凌空火花", role: "奇兵", tier: "Wildcard", power: 91, accuracy: 74, curve: 81, description: "大幅度上滑效果更好。" },
                { name: "弧线音符", role: "奇兵", tier: "Wildcard", power: 76, accuracy: 81, curve: 94, description: "瞄准边路会得到更高回报。" }
            ]
        },
        {
            name: "英格兰",
            code: "ENG",
            colors: ["#ffffff", "#1d4ed8"],
            rating: 89,
            unlocked: true,
            difficulty: "normal",
            players: [
                { name: "雄狮终结者", role: "王牌前锋", tier: "Ace", power: 89, accuracy: 91, curve: 84, description: "冷静且有力量。" },
                { name: "传中射手", role: "主力前锋", tier: "Starter", power: 86, accuracy: 87, curve: 83, description: "中高位射门更安全。" },
                { name: "引擎室", role: "主力中场", tier: "Starter", power: 80, accuracy: 89, curve: 80, description: "稳定、易上手。" },
                { name: "左脚爆点", role: "奇兵", tier: "Wildcard", power: 93, accuracy: 72, curve: 77, description: "力量强，但线路更难预测。" },
                { name: "后点弧线", role: "奇兵", tier: "Wildcard", power: 75, accuracy: 83, curve: 91, description: "斜向射门表现很好。" }
            ]
        },
        {
            name: "葡萄牙",
            code: "POR",
            colors: ["#d90429", "#ffd166"],
            rating: 88,
            unlocked: true,
            difficulty: "normal",
            players: [
                { name: "红色巨星", role: "王牌前锋", tier: "Ace", power: 92, accuracy: 88, curve: 89, description: "力量足，弧线也漂亮。" },
                { name: "边路指挥官", role: "主力前锋", tier: "Starter", power: 87, accuracy: 86, curve: 85, description: "均衡的进攻选择。" },
                { name: "控球枢纽", role: "主力中场", tier: "Starter", power: 79, accuracy: 90, curve: 82, description: "落点非常稳定。" },
                { name: "任意球手", role: "奇兵", tier: "Wildcard", power: 90, accuracy: 73, curve: 92, description: "最适合打远角弧线。" },
                { name: "电梯重炮", role: "奇兵", tier: "Wildcard", power: 94, accuracy: 69, curve: 75, description: "高风险的强力炮弹。" }
            ]
        },
        {
            name: "荷兰",
            code: "NED",
            colors: ["#ff7a00", "#1f2937"],
            rating: 87,
            unlocked: false,
            difficulty: "normal",
            players: [
                { name: "橙衣王牌", role: "王牌前锋", tier: "Ace", power: 90, accuracy: 89, curve: 87, description: "射门干脆，线路紧凑。" },
                { name: "风之刃", role: "主力前锋", tier: "Starter", power: 85, accuracy: 86, curve: 84, description: "扎实的全能射手。" },
                { name: "全攻全守核心", role: "主力中场", tier: "Starter", power: 78, accuracy: 89, curve: 81, description: "适合安全的中路射门。" },
                { name: "角度横扫", role: "奇兵", tier: "Wildcard", power: 91, accuracy: 71, curve: 90, description: "能绕开中路扑救。" },
                { name: "上旋球", role: "奇兵", tier: "Wildcard", power: 75, accuracy: 82, curve: 93, description: "大角度专家。" }
            ]
        },
        {
            name: "克罗地亚",
            code: "CRO",
            colors: ["#bfdbfe", "#ef4444"],
            rating: 86,
            unlocked: false,
            difficulty: "normal",
            players: [
                { name: "棋盘王牌", role: "王牌前锋", tier: "Ace", power: 87, accuracy: 91, curve: 86, description: "落点聪明，脚法细腻。" },
                { name: "将军射手", role: "主力前锋", tier: "Starter", power: 83, accuracy: 88, curve: 82, description: "可靠且有一定弧线。" },
                { name: "中场棋手", role: "主力中场", tier: "Starter", power: 77, accuracy: 90, curve: 80, description: "安全且有战术感。" },
                { name: "长传弧线", role: "奇兵", tier: "Wildcard", power: 89, accuracy: 72, curve: 88, description: "擅长弯向角落。" },
                { name: "最后变线", role: "奇兵", tier: "Wildcard", power: 74, accuracy: 81, curve: 92, description: "能从门将身边钻过去。" }
            ]
        },
        {
            name: "乌拉圭",
            code: "URU",
            colors: ["#cfe8ff", "#ffffff"],
            rating: 85,
            unlocked: false,
            difficulty: "normal",
            players: [
                { name: "天空利齿", role: "王牌前锋", tier: "Ace", power: 88, accuracy: 88, curve: 84, description: "侵略性强，直来直去。" },
                { name: "蓝色力量", role: "主力前锋", tier: "Starter", power: 84, accuracy: 85, curve: 82, description: "终结方式简洁。" },
                { name: "锚点核心", role: "主力中场", tier: "Starter", power: 78, accuracy: 89, curve: 80, description: "稳定且均衡。" },
                { name: "老炮重击", role: "奇兵", tier: "Wildcard", power: 91, accuracy: 70, curve: 76, description: "大力射门，容错更小。" },
                { name: "蓝色弧线", role: "奇兵", tier: "Wildcard", power: 73, accuracy: 82, curve: 90, description: "适合斜向落点。" }
            ]
        },
        {
            name: "日本",
            code: "JPN",
            colors: ["#fef2f2", "#ef4444"],
            rating: 84,
            unlocked: false,
            difficulty: "easy",
            players: [
                { name: "旭日王牌", role: "王牌前锋", tier: "Ace", power: 83, accuracy: 94, curve: 89, description: "快速、精准，新手友好。" },
                { name: "锐利边锋", role: "主力前锋", tier: "Starter", power: 79, accuracy: 91, curve: 85, description: "落点干净，很好控制。" },
                { name: "体系核心", role: "主力中场", tier: "Starter", power: 76, accuracy: 90, curve: 82, description: "非常稳定的中距离选择。" },
                { name: "快速突击", role: "奇兵", tier: "Wildcard", power: 87, accuracy: 74, curve: 80, description: "出脚快，控制难度适中。" },
                { name: "侧翼弧线", role: "奇兵", tier: "Wildcard", power: 72, accuracy: 82, curve: 92, description: "侧向角度表现优秀。" }
            ]
        },
        {
            name: "韩国",
            code: "KOR",
            colors: ["#ef4444", "#1f2937"],
            rating: 83,
            unlocked: false,
            difficulty: "easy",
            players: [
                { name: "猛虎王牌", role: "王牌前锋", tier: "Ace", power: 84, accuracy: 92, curve: 85, description: "可靠，容易快速掌控。" },
                { name: "速度边翼", role: "主力前锋", tier: "Starter", power: 80, accuracy: 88, curve: 82, description: "终结手感顺滑。" },
                { name: "控制核心", role: "主力中场", tier: "Starter", power: 75, accuracy: 90, curve: 80, description: "适合新玩家练习。" },
                { name: "爆发射门", role: "奇兵", tier: "Wildcard", power: 86, accuracy: 73, curve: 78, description: "力量不错，风险适中。" },
                { name: "角度跑位", role: "奇兵", tier: "Wildcard", power: 71, accuracy: 81, curve: 91, description: "适合弯向角落。" }
            ]
        },
        {
            name: "摩洛哥",
            code: "MAR",
            colors: ["#dc2626", "#16a34a"],
            rating: 82,
            unlocked: false,
            difficulty: "easy",
            players: [
                { name: "阿特拉斯王牌", role: "王牌前锋", tier: "Ace", power: 82, accuracy: 91, curve: 87, description: "均衡且好上手。" },
                { name: "沙漠边锋", role: "主力前锋", tier: "Starter", power: 79, accuracy: 88, curve: 84, description: "舒服的全能射门。" },
                { name: "脉冲核心", role: "主力中场", tier: "Starter", power: 74, accuracy: 89, curve: 81, description: "稳定且持续。" },
                { name: "野性弧线", role: "奇兵", tier: "Wildcard", power: 85, accuracy: 73, curve: 89, description: "宽角度上滑最好用。" },
                { name: "沙尘射门", role: "奇兵", tier: "Wildcard", power: 70, accuracy: 80, curve: 90, description: "落点刁钻，容易偷袭成功。" }
            ]
        },
        {
            name: "比利时",
            code: "BEL",
            colors: ["#ef4444", "#f59e0b"],
            rating: 81,
            unlocked: false,
            difficulty: "easy",
            players: [
                { name: "红色王牌", role: "王牌前锋", tier: "Ace", power: 83, accuracy: 90, curve: 84, description: "直接可靠。" },
                { name: "黄金边翼", role: "主力前锋", tier: "Starter", power: 78, accuracy: 87, curve: 82, description: "安全且均衡。" },
                { name: "中路核心", role: "主力中场", tier: "Starter", power: 74, accuracy: 88, curve: 80, description: "很容易上手。" },
                { name: "重脚射手", role: "奇兵", tier: "Wildcard", power: 86, accuracy: 71, curve: 76, description: "力量更强，控制更难。" },
                { name: "远角射手", role: "奇兵", tier: "Wildcard", power: 69, accuracy: 81, curve: 90, description: "斜向上滑效果更好。" }
            ]
        },
        {
            name: "瑞士",
            code: "SUI",
            colors: ["#ffffff", "#dc2626"],
            rating: 80,
            unlocked: false,
            difficulty: "easy",
            players: [
                { name: "雪山王牌", role: "王牌前锋", tier: "Ace", power: 81, accuracy: 91, curve: 85, description: "干净、安全、精准。" },
                { name: "红翼前锋", role: "主力前锋", tier: "Starter", power: 77, accuracy: 87, curve: 82, description: "终结线路稳定。" },
                { name: "核心路线", role: "主力中场", tier: "Starter", power: 73, accuracy: 88, curve: 80, description: "稳定且新手友好。" },
                { name: "尖刺射门", role: "奇兵", tier: "Wildcard", power: 84, accuracy: 72, curve: 88, description: "适合刁钻射门。" },
                { name: "宽幅弯刀", role: "奇兵", tier: "Wildcard", power: 68, accuracy: 80, curve: 90, description: "打弧线角落最合适。" }
            ]
        },
        {
            name: "加纳",
            code: "GHA",
            colors: ["#facc15", "#16a34a"],
            rating: 79,
            unlocked: false,
            difficulty: "easy",
            players: [
                { name: "黄金王牌", role: "王牌前锋", tier: "Ace", power: 82, accuracy: 89, curve: 83, description: "好玩、快速、直接。" },
                { name: "黑星边翼", role: "主力前锋", tier: "Starter", power: 77, accuracy: 86, curve: 81, description: "轻快且均衡。" },
                { name: "核心线路", role: "主力中场", tier: "Starter", power: 72, accuracy: 88, curve: 79, description: "容易掌握。" },
                { name: "闪电射门", role: "奇兵", tier: "Wildcard", power: 85, accuracy: 70, curve: 77, description: "力量高，也有一些风险。" },
                { name: "边缘弧线", role: "奇兵", tier: "Wildcard", power: 67, accuracy: 79, curve: 89, description: "适合后段突然变线。" }
            ]
        }
    ];

    private currentScreen: GameScreen = "home";
    private currentMode: MatchMode = "pk";
    private selectedTeamIndex = 0;
    private selectedPlayerIndex = 0;
    private playerScore = 0;
    private enemyScore = 0;
    private playerShots = 0;
    private enemyShots = 0;
    private currentStreak = 0;
    private bestStreak = 0;
    private isSuddenDeath = false;
    private isProcessingShot = false;
    private shootStartPoint: Laya.Point | null = null;
    private keeperRead = 0;
    private dragPreview: Laya.Sprite | null = null;
    private dragHintLabel: Laya.Text | null = null;
    private goalkeeper: Laya.Sprite | null = null;
    private ball: Laya.Sprite | null = null;
    private scoreLabel: Laya.Text | null = null;
    private roundLabel: Laya.Text | null = null;
    private modeLabel: Laya.Text | null = null;
    private remainLabel: Laya.Text | null = null;
    private summary: MatchSummary | null = null;
    private settings = {
        sound: true,
        vibration: true
    };
    private topScore = 0;
    private totalWins = 0;

    onAwake(): void {
        Main.bootstrapped = true;
    }

    onStart(): void {
        this.loadSave();
        this.bootstrap();
    }

    static ensureBoot(owner: Laya.Node): void {
        if (Main.bootstrapped) {
            return;
        }
        const existing = owner.getComponent(Main);
        if (!existing) {
            owner.addComponent(Main);
        }
    }

    private bootstrap(): void {
        const owner = this.owner as Laya.Sprite;
        owner.removeChildren();
        owner.width = this.designWidth;
        owner.height = this.designHeight;

        if (Laya.stage) {
            Laya.stage.size(this.designWidth, this.designHeight);
            Laya.stage.bgColor = "#07111f";
            Laya.stage.scaleMode = "showall";
            Laya.stage.screenMode = "vertical";
            Laya.stage.alignH = "center";
            Laya.stage.alignV = "middle";
        }

        this.ui.bg = new Laya.Sprite();
        this.ui.bg.size(this.designWidth, this.designHeight);
        owner.addChild(this.ui.bg);

        this.ui.field = new Laya.Sprite();
        this.ui.field.size(this.designWidth, this.designHeight);
        owner.addChild(this.ui.field);

        this.ui.hud = new Laya.Sprite();
        this.ui.hud.size(this.designWidth, this.designHeight);
        owner.addChild(this.ui.hud);

        this.ui.overlay = new Laya.Sprite();
        this.ui.overlay.size(this.designWidth, this.designHeight);
        owner.addChild(this.ui.overlay);

        this.ui.toast = this.createLabel("", 375, 1180, 28, "#ffffff", true);
        this.ui.toast.visible = false;
        this.ui.toast.zOrder = 99;
        owner.addChild(this.ui.toast);

        this.renderHome();
    }

    private renderHome(): void {
        this.currentScreen = "home";
        this.clearContainers();
        this.drawBackdrop("#071225", "#16633b");

        this.addTitle("世界杯点球大战", "上滑射门，左右拖动调整角度");
        this.drawHeroVisual();

        const rankButton = this.createButton("排行", 664, 88, 92, 48, "#174777");
        rankButton.on(Laya.Event.CLICK, this, () => this.renderRank());
        this.ui.overlay!.addChild(rankButton);

        const careerButton = this.createPrimaryButton("闯关模式", 375, 640, 430, 98, "#16a765");
        careerButton.on(Laya.Event.CLICK, this, () => {
            this.currentMode = "career";
            this.renderModeIntro();
        });

        const pkButton = this.createPrimaryButton("点球大战", 375, 770, 430, 98, "#f0a91d");
        pkButton.on(Laya.Event.CLICK, this, () => {
            this.currentMode = "pk";
            this.renderModeIntro();
        });

        this.ui.overlay!.addChild(careerButton);
        this.ui.overlay!.addChild(pkButton);

        this.ui.overlay!.addChild(this.createGlassPanel(70, 920, 610, 230, "#07182fe0"));
        this.ui.overlay!.addChild(this.createInfoLine("球队", `已解锁 ${this.getUnlockedTeamCount()}/16，80 名射手待命。`, 110, 975));
        this.ui.overlay!.addChild(this.createInfoLine("操作", "按住向上滑动，滑得越长力量越大。", 110, 1035));
        this.ui.overlay!.addChild(this.createInfoLine("纪录", `最高进球 ${this.topScore}，胜场 ${this.totalWins}。`, 110, 1095));

        const soundButton = this.createButton(this.settings.sound ? "音效开" : "音效关", 150, 1242, 150, 48, "#1f4b7a");
        soundButton.on(Laya.Event.CLICK, this, () => {
            this.settings.sound = !this.settings.sound;
            Laya.SoundManager.muted = !this.settings.sound;
            this.saveProgress();
            this.renderHome();
        });
        const vibeButton = this.createButton(this.settings.vibration ? "震动开" : "震动关", 335, 1242, 150, 48, "#1f4b7a");
        vibeButton.on(Laya.Event.CLICK, this, () => {
            this.settings.vibration = !this.settings.vibration;
            this.saveProgress();
            this.renderHome();
        });
        const resetButton = this.createButton("重置", 540, 1242, 150, 48, "#743030");
        resetButton.on(Laya.Event.CLICK, this, () => {
            this.resetSave();
            this.showToast("本地存档已重置。");
            this.renderHome();
        });
        this.ui.overlay!.addChild(soundButton);
        this.ui.overlay!.addChild(vibeButton);
        this.ui.overlay!.addChild(resetButton);
    }

    private renderRank(): void {
        this.currentScreen = "rank";
        this.clearContainers();
        this.drawBackdrop("#071225", "#143b63");
        this.addBackButton(() => this.renderHome());
        this.addTitle("本地排行榜", "记录你的点球高光表现");

        const panel = this.createGlassPanel(70, 220, 610, 760, "#071522e8");
        this.ui.overlay!.addChild(panel);

        const entries = [
            { label: "最高单局进球", value: `${this.topScore} 球`, color: "#ffe082" },
            { label: "累计胜场", value: `${this.totalWins} 场`, color: "#84f5b7" },
            { label: "已解锁球队", value: `${this.getUnlockedTeamCount()} / ${this.teamPool.length}`, color: "#9bd8ff" },
            { label: "当前球队", value: this.teamPool[this.selectedTeamIndex].name, color: "#ffffff" },
            { label: "当前射手", value: this.teamPool[this.selectedTeamIndex].players[this.selectedPlayerIndex].name, color: "#ffffff" }
        ];

        entries.forEach((entry, index) => {
            const y = 295 + index * 96;
            const row = this.createGlassPanel(105, y, 540, 72, index === 0 ? "#1c4f75dd" : "#0a2036cc");
            this.ui.overlay!.addChild(row);
            this.ui.overlay!.addChild(this.createLabel(`${index + 1}`, 135, y + 36, 28, "#071522", true));
            this.ui.overlay!.addChild(this.createLabel(entry.label, 178, y + 18, 23, "#b9d8ff"));
            this.ui.overlay!.addChild(this.createLabel(entry.value, 600, y + 36, 28, entry.color, true));
        });

        const note = this.createParagraph("排行榜数据保存在本机。接入抖音开放数据域后，可以把这里升级为好友榜和世界榜。", 115, 820, 520, 24);
        note.color = "#d7ecff";
        this.ui.overlay!.addChild(note);

        const startButton = this.createPrimaryButton("去挑战新纪录", 375, 1095, 420, 84, "#0f9d58");
        startButton.on(Laya.Event.CLICK, this, () => this.renderModeIntro());
        const homeButton = this.createPrimaryButton("返回首页", 375, 1210, 420, 84, "#19446a");
        homeButton.on(Laya.Event.CLICK, this, () => this.renderHome());
        this.ui.overlay!.addChild(startButton);
        this.ui.overlay!.addChild(homeButton);
    }

    private renderModeIntro(): void {
        this.currentScreen = "mode";
        this.clearContainers();
        this.drawBackdrop("#102033", "#094067");
        this.addBackButton(() => this.renderHome());
        this.addTitle(
            this.currentMode === "career" ? "闯关模式" : "点球大战",
            this.currentMode === "career" ? "快速挑战节奏" : "经典五轮点球对决"
        );

        const panel = this.createGlassPanel(70, 230, 610, 590, "#091624d9");
        this.ui.overlay!.addChild(panel);

        const lines = this.currentMode === "career"
            ? [
                "连续完成 5 次射门，门将难度会逐步提升。",
                "单局约 30 到 60 秒，适合短平快游玩。",
                "适合体验射门手感和成长节奏。"
            ]
            : [
                "操控射手进行经典点球对决。",
                "五轮后平局会进入突然死亡。",
                "当前版本重点验证射门与 AI 门将逻辑。"
            ];

        lines.forEach((line, index) => {
            const y = 292 + index * 76;
            const item = this.createGlassPanel(108, y, 534, 54, "#0c2038aa");
            this.ui.overlay!.addChild(item);
            this.ui.overlay!.addChild(this.createLabel(`${index + 1}`, 136, y + 28, 24, "#ffe082", true));
            const desc = this.createLabel(line, 168, y + 15, 24, "#d7ecff");
            desc.width = 430;
            desc.wordWrap = false;
            this.ui.overlay!.addChild(desc);
        });

        const tips = this.createGlassPanel(112, 548, 526, 200, "#12314fcc");
        this.ui.overlay!.addChild(tips);
        this.ui.overlay!.addChild(this.createLabel("技巧", 165, 584, 30, "#ffe082"));
        const tipOne = this.createLabel("观察门将重心，反方向打上角更容易进。", 142, 626, 24, "#d7ecff");
        tipOne.width = 466;
        tipOne.wordWrap = false;
        this.ui.overlay!.addChild(tipOne);
        const tipTwo = this.createLabel("力量停在金色甜点区，会触发完美射门。", 142, 670, 24, "#d7ecff");
        tipTwo.width = 466;
        tipTwo.wordWrap = false;
        this.ui.overlay!.addChild(tipTwo);

        const continueButton = this.createPrimaryButton("选择球队", 375, 920, 420, 90, "#0f9d58");
        continueButton.on(Laya.Event.CLICK, this, () => this.renderTeamSelect());
        this.ui.overlay!.addChild(continueButton);
    }

    private renderTeamSelect(): void {
        this.currentScreen = "team";
        this.clearContainers();
        this.drawBackdrop("#0d1b2a", "#194d33");
        this.addBackButton(() => this.renderModeIntro());
        this.addTitle("选择球队", "未解锁球队用于模拟激励广告解锁流程");

        const team = this.teamPool[this.selectedTeamIndex];
        const mainCard = this.createGlassPanel(70, 205, 610, 300, "#0b1523d9");
        this.ui.overlay!.addChild(mainCard);
        this.drawTeamBadge(205, 352, 86, team);
        this.ui.overlay!.addChild(this.createLabel(team.name, 345, 294, 46, "#ffffff"));
        this.ui.overlay!.addChild(this.createLabel(`${team.code}  评分 ${team.rating}`, 345, 352, 26, "#b3d7ff"));
        this.ui.overlay!.addChild(this.createLabel(`门将：${this.difficultyText(team.difficulty)}`, 345, 390, 24, "#ffe082"));
        this.ui.overlay!.addChild(this.createLabel(team.unlocked ? "可直接出战" : "观看广告模拟解锁", 345, 430, 22, team.unlocked ? "#84f5b7" : "#ffb86c"));

        const leftButton = this.createButton("<", 110, 352, 62, 62, "#17324d");
        leftButton.on(Laya.Event.CLICK, this, () => {
            this.selectedTeamIndex = (this.selectedTeamIndex + this.teamPool.length - 1) % this.teamPool.length;
            this.renderTeamSelect();
        });
        const rightButton = this.createButton(">", 640, 352, 62, 62, "#17324d");
        rightButton.on(Laya.Event.CLICK, this, () => {
            this.selectedTeamIndex = (this.selectedTeamIndex + 1) % this.teamPool.length;
            this.renderTeamSelect();
        });
        this.ui.overlay!.addChild(leftButton);
        this.ui.overlay!.addChild(rightButton);

        this.ui.overlay!.addChild(this.createLabel("全部球队", 92, 552, 28, "#ffe082"));
        this.ui.overlay!.addChild(this.createLabel("左右按钮可切换，点击卡片快速选择", 478, 558, 20, "#9ec5ff", true));
        this.teamPool.forEach((item, index) => {
            const col = index % 2;
            const rowIndex = Math.floor(index / 2);
            const x = 70 + col * 310;
            const y = 590 + rowIndex * 66;
            const selected = index === this.selectedTeamIndex;
            const card = this.createGlassPanel(x, y, 292, 54, selected ? "#1d5b83e6" : "#0a1828cc");
            card.on(Laya.Event.CLICK, this, () => {
                this.selectedTeamIndex = index;
                this.renderTeamSelect();
            });
            this.ui.overlay!.addChild(card);
            this.drawMiniTeamBadge(x + 32, y + 27, item);
            this.ui.overlay!.addChild(this.createLabel(item.code, x + 32, y + 27, 14, "#0b1730", true));
            this.ui.overlay!.addChild(this.createLabel(item.name, x + 70, y + 8, 20, "#ffffff"));
            this.ui.overlay!.addChild(this.createLabel(`评分 ${item.rating}  ${this.difficultyText(item.difficulty)}`, x + 70, y + 30, 15, "#9ec5ff"));
            this.ui.overlay!.addChild(this.createLabel(item.unlocked ? "已解锁" : "待解锁", x + 248, y + 28, 16, item.unlocked ? "#84f5b7" : "#ffb86c", true));
        });

        const cta = this.createPrimaryButton(team.unlocked ? "选择球队" : "模拟解锁", 375, 1190, 420, 84, team.unlocked ? "#1b9c61" : "#cb6d20");
        cta.on(Laya.Event.CLICK, this, () => {
            if (!team.unlocked) {
                this.mockRewardUnlock(team);
                this.showToast(`${team.name} 已解锁。`);
                this.renderTeamSelect();
                return;
            }
            this.selectedPlayerIndex = 0;
            this.saveProgress();
            this.renderPlayerSelect();
        });
        this.ui.overlay!.addChild(cta);
    }

    private renderPlayerSelect(): void {
        this.currentScreen = "player";
        this.clearContainers();
        const team = this.teamPool[this.selectedTeamIndex];
        const player = team.players[this.selectedPlayerIndex];

        this.drawBackdrop(team.colors[0], team.colors[1], true);
        this.addBackButton(() => this.renderTeamSelect());
        this.addTitle(`${team.name} 射手`, "力量、精度和弧线会影响射门结果");

        const topPanel = this.createGlassPanel(72, 200, 606, 245, "#08111edd");
        this.ui.overlay!.addChild(topPanel);
        this.drawTeamBadge(152, 323, 72, team);
        this.ui.overlay!.addChild(this.createLabel(player.name, 250, 268, 40, "#ffffff"));
        this.ui.overlay!.addChild(this.createLabel(`${player.role} / ${this.tierText(player.tier)}`, 250, 316, 24, "#ffe082"));
        this.ui.overlay!.addChild(this.createParagraph(player.description, 250, 360, 360, 27));

        this.ui.overlay!.addChild(this.createGlassPanel(72, 475, 606, 210, "#07182fcc"));
        this.drawStatBar("力量", player.power, 112, 515, "#f97316");
        this.drawStatBar("精度", player.accuracy, 112, 580, "#38bdf8");
        this.drawStatBar("弧线", player.curve, 112, 645, "#22c55e");

        this.ui.overlay!.addChild(this.createLabel("阵容", 92, 730, 28, "#ffe082"));
        this.ui.overlay!.addChild(this.createLabel("选择一名射手出战", 548, 736, 22, "#9ec5ff", true));
        team.players.forEach((item, index) => {
            const y = 775 + index * 82;
            const selected = index === this.selectedPlayerIndex;
            const row = this.createGlassPanel(72, y, 606, 66, selected ? "#14466bcc" : "#0a1828cc");
            row.on(Laya.Event.CLICK, this, () => {
                this.selectedPlayerIndex = index;
                this.renderPlayerSelect();
            });
            this.ui.overlay!.addChild(row);
            this.ui.overlay!.addChild(this.createLabel(item.name, 104, y + 18, 25, "#ffffff"));
            this.ui.overlay!.addChild(this.createLabel(`${item.role} / ${this.tierText(item.tier)}`, 104, y + 45, 18, "#ffe082"));
            const statText = this.createLabel(`力${item.power}  精${item.accuracy}  弧${item.curve}`, 438, y + 24, 18, "#b9d8ff");
            statText.width = 200;
            statText.align = "right";
            this.ui.overlay!.addChild(statText);
        });

        const startButton = this.createPrimaryButton("开始比赛", 375, 1220, 430, 84, "#0f9d58");
        startButton.on(Laya.Event.CLICK, this, () => {
            this.saveProgress();
            this.startMatch();
        });
        this.ui.overlay!.addChild(startButton);
    }

    private startMatch(): void {
        this.playerScore = 0;
        this.enemyScore = 0;
        this.playerShots = 0;
        this.enemyShots = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.isSuddenDeath = false;
        this.summary = null;
        this.prepareKeeperRead();
        this.renderMatch();
    }

    private renderMatch(): void {
        this.currentScreen = "match";
        this.clearContainers();
        const team = this.teamPool[this.selectedTeamIndex];
        this.drawBackdrop("#092032", "#125c39");
        this.drawPitch();
        this.buildHud(team);
        this.buildGoalScene(team);
        this.showToast("按住并向上滑动射门。", 1800);
        this.attachShotInput();
        this.refreshHud();
    }

    private buildHud(team: TeamData): void {
        const hudPanel = this.createGlassPanel(28, 32, 694, 132, "#071522d9");
        this.ui.hud!.addChild(hudPanel);
        this.scoreLabel = this.createLabel("0 : 0", 375, 86, 44, "#ffffff", true);
        this.roundLabel = this.createLabel("第 1 / 5 轮", 145, 78, 23, "#9ed0ff", true);
        this.modeLabel = this.createLabel(this.currentMode === "career" ? "闯关" : `${team.name} PK`, 590, 78, 23, "#ffe082", true);
        this.remainLabel = this.createLabel("", 375, 136, 22, "#84f5b7", true);
        this.ui.hud!.addChild(this.scoreLabel);
        this.ui.hud!.addChild(this.roundLabel);
        this.ui.hud!.addChild(this.modeLabel);
        this.ui.hud!.addChild(this.remainLabel);

        const quitButton = this.createButton("退出", 668, 122, 72, 42, "#8a1f1f");
        quitButton.on(Laya.Event.CLICK, this, () => this.finishMatch("返回首页。", false));
        this.ui.hud!.addChild(quitButton);
    }

    private buildGoalScene(team: TeamData): void {
        this.ui.field!.graphics.clear();

        const crowd = new Laya.Sprite();
        crowd.graphics.drawRect(0, 0, this.designWidth, 300, "#142945");
        crowd.graphics.drawRect(0, 250, this.designWidth, 50, "#0d2038");
        this.ui.field!.addChild(crowd);

        for (let i = 0; i < 34; i++) {
            const fan = new Laya.Sprite();
            const color = i % 4 === 0 ? "#ffd166" : i % 4 === 1 ? "#d9e4ff" : i % 4 === 2 ? "#ff7a7a" : "#84f5b7";
            fan.graphics.drawCircle(0, 0, 8 + (i % 3), color);
            fan.graphics.drawRect(-8, 8, 16, 14, this.withAlpha(color, 0.52));
            fan.pos(18 + i * 23, 172 + (i % 5) * 16);
            this.ui.field!.addChild(fan);
        }

        this.drawStadiumLights(this.ui.field!);

        const goalFrame = new Laya.Sprite();
        goalFrame.graphics.drawRect(139, 226, 472, 20, "#ffffff");
        goalFrame.graphics.drawRect(145, 230, 16, 224, "#f4f7ff");
        goalFrame.graphics.drawRect(589, 230, 16, 224, "#f4f7ff");
        goalFrame.graphics.drawRect(161, 246, 428, 8, this.withAlpha("#b8d8ff", 0.2));
        for (let x = 181; x <= 561; x += 38) {
            goalFrame.graphics.drawLine(x, 246, x, 446, this.withAlpha("#e8f5ff", 0.42), 2);
        }
        for (let y = 278; y <= 426; y += 32) {
            goalFrame.graphics.drawLine(161, y, 589, y, this.withAlpha("#e8f5ff", 0.42), 2);
        }
        goalFrame.graphics.drawLines(0, 0, [161, 246, 590, 246, 590, 446, 161, 446, 161, 246], "#d2dde8", 2);
        this.ui.field!.addChild(goalFrame);

        const grass = new Laya.Sprite();
        grass.loadImage(Main.pitchImage);
        grass.pos(0, 450);
        grass.size(this.designWidth, 884);
        this.ui.field!.addChild(grass);

        for (let i = 0; i < 8; i++) {
            const stripe = new Laya.Sprite();
            stripe.graphics.drawRect(0, 0, this.designWidth, 58, i % 2 === 0 ? this.withAlpha("#1fb65d", 0.45) : this.withAlpha("#0b5f35", 0.35));
            stripe.pos(0, 456 + i * 104);
            this.ui.field!.addChild(stripe);
        }

        const penaltyBox = new Laya.Sprite();
        penaltyBox.graphics.drawLines(0, 0, [120, 450, 630, 450, 630, 720, 120, 720, 120, 450], "#d7fbe8", 3);
        penaltyBox.graphics.drawLines(0, 0, [245, 450, 505, 450, 505, 575, 245, 575, 245, 450], "#d7fbe8", 3);
        this.ui.field!.addChild(penaltyBox);

        const shooter = new Laya.Sprite();
        shooter.graphics.drawCircle(0, -22, 24, "#ffe0bd");
        shooter.graphics.drawCircle(-8, -26, 3, "#1f2937");
        shooter.graphics.drawCircle(8, -26, 3, "#1f2937");
        shooter.graphics.drawRect(-20, 4, 40, 62, team.colors[0]);
        shooter.graphics.drawRect(-14, 14, 28, 12, team.colors[1]);
        shooter.graphics.drawRect(-34, 18, 14, 48, "#102033");
        shooter.graphics.drawRect(20, 18, 14, 48, "#102033");
        shooter.graphics.drawRect(-16, 66, 12, 56, "#152238");
        shooter.graphics.drawRect(4, 66, 12, 56, "#152238");
        shooter.graphics.drawCircle(-10, 126, 8, "#f8fafc");
        shooter.graphics.drawCircle(12, 126, 8, "#f8fafc");
        shooter.pos(375, 980);
        this.ui.field!.addChild(shooter);

        this.goalkeeper = new Laya.Sprite();
        this.redrawGoalkeeper("#fb7185");
        this.goalkeeper.pos(375, 390);
        this.ui.field!.addChild(this.goalkeeper);

        this.ball = new Laya.Sprite();
        this.drawFootballTexture();
        this.ball.pos(375, 888);
        this.ui.field!.addChild(this.ball);

        this.drawTargetZones();
        this.dragPreview = new Laya.Sprite();
        this.ui.field!.addChild(this.dragPreview);
        this.dragHintLabel = this.createLabel(this.keeperReadText(), 375, 1184, 24, "#e8fff3", true);
        this.ui.field!.addChild(this.dragHintLabel);
    }

    private drawFootballTexture(): void {
        if (!this.ball) {
            return;
        }
        Laya.loader.load(Main.ballImage).then((texture: Laya.Texture) => {
            if (!this.ball || !texture) {
                return;
            }
            this.ball.graphics.clear();
            this.ball.graphics.drawImage(texture, -23, -19, 46, 38);
        });
    }

    private attachShotInput(): void {
        this.ui.overlay!.offAll();
        this.ui.overlay!.mouseEnabled = true;
        this.ui.overlay!.graphics.clear();
        this.ui.overlay!.graphics.drawRect(0, 170, this.designWidth, this.designHeight - 170, this.withAlpha("#000000", 0.01));
        this.ui.overlay!.on(Laya.Event.MOUSE_DOWN, this, this.handleShotStart);
        this.ui.overlay!.on(Laya.Event.MOUSE_MOVE, this, this.handleShotMove);
        this.ui.overlay!.on(Laya.Event.MOUSE_UP, this, this.handleShotEnd);
        this.ui.overlay!.on(Laya.Event.MOUSE_OUT, this, this.handleShotCancel);
    }

    private detachShotInput(): void {
        this.ui.overlay!.off(Laya.Event.MOUSE_DOWN, this, this.handleShotStart);
        this.ui.overlay!.off(Laya.Event.MOUSE_MOVE, this, this.handleShotMove);
        this.ui.overlay!.off(Laya.Event.MOUSE_UP, this, this.handleShotEnd);
        this.ui.overlay!.off(Laya.Event.MOUSE_OUT, this, this.handleShotCancel);
        this.ui.overlay!.graphics.clear();
    }

    private handleShotStart(evt: Laya.Event): void {
        if (this.isProcessingShot) {
            return;
        }
        this.shootStartPoint = new Laya.Point(evt.stageX, evt.stageY);
        this.dragPreview!.graphics.clear();
        this.dragHintLabel!.text = "瞄准角落，力度停在金色区";
    }

    private handleShotMove(evt: Laya.Event): void {
        if (!this.shootStartPoint || this.isProcessingShot) {
            return;
        }
        const current = new Laya.Point(evt.stageX, evt.stageY);
        const deltaX = current.x - this.shootStartPoint.x;
        const deltaY = current.y - this.shootStartPoint.y;
        const powerFactor = this.getPowerFactor(deltaY);
        const angleFactor = this.getAngleFactor(deltaX);
        const quality = this.getShotQuality(powerFactor, angleFactor);
        const previewColor = quality === "perfect" ? "#ffe066" : quality === "good" ? "#84f5b7" : quality === "risky" ? "#ff8a65" : "#ffffff";
        const targetX = 375 + angleFactor * 205;
        const targetY = 342 - powerFactor * 104;
        this.dragPreview!.graphics.clear();
        this.dragPreview!.graphics.drawLine(this.shootStartPoint.x, this.shootStartPoint.y, current.x, current.y, previewColor, 5);
        this.dragPreview!.graphics.drawLine(375, 888, targetX, targetY, this.withAlpha(previewColor, 0.38), 3);
        this.dragPreview!.graphics.drawCircle(current.x, current.y, 10, previewColor);
        this.dragPreview!.graphics.drawCircle(targetX, targetY, 18, this.withAlpha(previewColor, 0.26));
        this.dragPreview!.graphics.drawCircle(targetX, targetY, 6, previewColor);
        this.drawPowerMeter(powerFactor, quality);
        this.dragHintLabel!.text = this.previewShotText(powerFactor, angleFactor, quality);
    }

    private handleShotEnd(evt: Laya.Event): void {
        if (!this.shootStartPoint || this.isProcessingShot) {
            return;
        }
        const endPoint = new Laya.Point(evt.stageX, evt.stageY);
        const deltaX = endPoint.x - this.shootStartPoint.x;
        const deltaY = endPoint.y - this.shootStartPoint.y;
        this.dragPreview!.graphics.clear();
        this.shootStartPoint = null;

        if (deltaY > -80) {
            this.dragHintLabel!.text = "自动补射！下次试试上滑";
            const autoSide = this.keeperRead === 0 ? (Math.random() < 0.5 ? -1 : 1) : -this.keeperRead;
            this.takeShot(autoSide * 96, -360);
            return;
        }

        this.takeShot(deltaX, deltaY);
    }

    private handleShotCancel(): void {
        if (!this.shootStartPoint) {
            return;
        }
        this.shootStartPoint = null;
        this.dragPreview!.graphics.clear();
        this.dragHintLabel!.text = this.keeperReadText();
    }

    private takeShot(deltaX: number, deltaY: number): void {
        this.isProcessingShot = true;
        this.dragHintLabel!.text = "射门中...";

        const team = this.teamPool[this.selectedTeamIndex];
        const player = team.players[this.selectedPlayerIndex];
        const shot = this.computeShotResult(player, team.difficulty, deltaX, deltaY);

        const startBallX = 375;
        const startBallY = 888;
        const trail = new Laya.Sprite();
        this.ui.field!.addChild(trail);
        const updateTrail = (): void => {
            if (!this.ball) {
                return;
            }
            trail.graphics.clear();
            trail.graphics.drawLine(startBallX, startBallY, this.ball.x, this.ball.y, "#d7f8ff", 3);
        };

        this.animateGoalkeeperDive(shot);

        Laya.timer.frameLoop(1, this, updateTrail);

        Laya.Tween.to(this.ball!, {
            x: shot.ballEndX,
            y: shot.ballEndY,
            scaleX: 0.55,
            scaleY: 0.55,
            rotation: (shot.ballEndX - 375) * 0.4
        }, 320, null, Laya.Handler.create(this, () => {
            Laya.timer.clear(this, updateTrail);
            trail.removeSelf();
            trail.destroy();
            this.bounceBallAfterShot(shot, () => this.resolveShot(shot));
        }));
    }

    private bounceBallAfterShot(shot: ShotResult, complete: () => void): void {
        if (!this.ball || !this.ui.field) {
            complete();
            return;
        }

        const ball = this.ball;
        const groundY = shot.isMiss ? Math.min(830, shot.ballEndY + 210) : Math.min(660, shot.ballEndY + 190);
        const landingX = Math.max(115, Math.min(635, shot.ballEndX + shot.angleFactor * 34));
        const bouncePeakY = Math.max(250, groundY - (shot.isSaved ? 58 : shot.isMiss ? 76 : 92));
        const settleX = Math.max(115, Math.min(635, landingX + shot.angleFactor * 24));

        const shadow = new Laya.Sprite();
        shadow.alpha = 0;
        shadow.graphics.drawEllipse(-28, -5, 56, 10, this.withAlpha("#001321", 0.42), null, 0);
        shadow.pos(landingX, groundY + 22);
        this.ui.field.addChild(shadow);

        Laya.Tween.clearAll(ball);
        Laya.Tween.to(ball, {
            x: landingX,
            y: groundY,
            scaleX: 0.82,
            scaleY: 0.45,
            rotation: ball.rotation + shot.angleFactor * 120
        }, 210, null, Laya.Handler.create(this, () => {
            shadow.alpha = 0.55;
            Laya.Tween.to(ball, {
                x: (landingX + settleX) / 2,
                y: bouncePeakY,
                scaleX: 0.64,
                scaleY: 0.64,
                rotation: ball.rotation + 145
            }, 170, null, Laya.Handler.create(this, () => {
                Laya.Tween.to(ball, {
                    x: settleX,
                    y: groundY + 18,
                    scaleX: 0.68,
                    scaleY: 0.58,
                    rotation: ball.rotation + 92
                }, 190, null, Laya.Handler.create(this, () => {
                    Laya.Tween.to(ball, {
                        scaleX: 0.62,
                        scaleY: 0.62
                    }, 90);
                    Laya.Tween.to(shadow, { alpha: 0 }, 260, null, Laya.Handler.create(this, () => {
                        shadow.removeSelf();
                        shadow.destroy();
                    }));
                    complete();
                }));
            }));
        }));
    }

    private computeShotResult(player: PlayerData, difficulty: ShotDifficulty, deltaX: number, deltaY: number): ShotResult {
        const powerFactor = this.getPowerFactor(deltaY);
        const angleFactor = this.getAngleFactor(deltaX);
        const quality = this.getShotQuality(powerFactor, angleFactor);
        const curveBonus = (player.curve - 70) / 25;
        const accuracySpread = (100 - player.accuracy) / 100;
        const difficultyBias = difficulty === "easy" ? 0.15 : difficulty === "hard" ? -0.14 : 0;
        const powerBias = (player.power - 80) / 120;
        const perfectBonus = quality === "perfect" ? 0.22 : quality === "good" ? 0.1 : quality === "risky" ? -0.08 : 0;
        const streakBonus = Math.min(0.09, this.currentStreak * 0.03);
        const readCounterBonus = this.keeperRead !== 0 && Math.sign(angleFactor) === -this.keeperRead ? 0.16 : 0;
        const centralPenalty = Math.abs(angleFactor) < 0.22 ? 0.12 : 0;

        const targetX = 375 + angleFactor * 184 + angleFactor * curveBonus * 34;
        const targetY = 346 - powerFactor * 102;
        const stabilityBonus = quality === "perfect" ? 0.45 : quality === "good" ? 0.25 : 0;
        const driftX = (Math.random() - 0.5) * 96 * Math.max(0.08, accuracySpread - stabilityBonus * 0.12);
        const driftY = Math.random() * 64 * Math.max(0.1, accuracySpread - stabilityBonus * 0.1);
        const finalX = targetX + driftX;
        const finalY = targetY + driftY;

        const diveDirection = this.keeperRead !== 0 && Math.random() < 0.68 ? this.keeperRead : (Math.random() < 0.28 ? 0 : (Math.random() < 0.5 ? -1 : 1));
        const saveReach = difficulty === "easy" ? 106 : difficulty === "hard" ? 156 : 132;
        const keeperTargetX = 375 + diveDirection * (diveDirection === 0 ? 0 : 132);
        const keeperTargetY = 365 - Math.min(48, Math.max(0, (powerFactor - 0.52) * 120));
        const saveWindowX = Math.abs(finalX - keeperTargetX);
        const saveWindowY = Math.abs(finalY - keeperTargetY);

        const overPowerPenalty = powerFactor > 0.92 ? (powerFactor - 0.92) * 0.9 : 0;
        const weakPenalty = powerFactor < 0.38 ? (0.38 - powerFactor) * 0.6 : 0;
        const missChance = Math.max(0.015, 0.14 + accuracySpread * 0.18 + overPowerPenalty + weakPenalty - perfectBonus - player.accuracy / 900);
        const keeperReadMatch = this.keeperRead !== 0 && Math.sign(angleFactor) === this.keeperRead ? 0.18 : 0;
        const savedChance = Math.max(0.12, 0.52 - powerBias - curveBonus * 0.05 - Math.abs(angleFactor) * 0.08 - difficultyBias - perfectBonus - readCounterBonus - streakBonus + centralPenalty + keeperReadMatch);

        const wideMiss = finalX < 150 || finalX > 600 || finalY < 230;
        const randomMiss = Math.random() < missChance && (quality === "risky" || powerFactor > 0.93 || Math.abs(angleFactor) > 0.9);
        const inSaveZone = saveWindowX < saveReach && saveWindowY < 118;
        const isSaved = !wideMiss && !randomMiss && inSaveZone && Math.random() < savedChance;
        const isMiss = wideMiss || randomMiss;
        const isGoal = !isSaved && !isMiss;

        let ballEndX = finalX;
        let ballEndY = finalY;
        if (isSaved) {
            ballEndX = keeperTargetX;
            ballEndY = keeperTargetY + 28;
        } else if (isMiss) {
            ballEndY = Math.max(200, finalY - 40);
        }

        return {
            isGoal,
            isSaved,
            isMiss,
            ballEndX,
            ballEndY,
            diveDirection,
            saveReach,
            keeperTargetX,
            keeperTargetY,
            quality,
            powerFactor,
            angleFactor,
            message: this.shotMessage(isGoal, isSaved, isMiss, quality, angleFactor)
        };
    }

    private resolveShot(shot: ShotResult): void {
        if (shot.isGoal) {
            this.playerScore += 1;
            this.currentStreak += 1;
            this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
            this.triggerVibration(shot.quality === "perfect" ? "heavy" : "medium");
        } else {
            this.currentStreak = 0;
            this.triggerVibration("light");
        }
        this.playerShots += 1;
        this.refreshHud();
        this.showToast(shot.message, 1200);

        Laya.timer.once(700, this, () => {
            this.simulateEnemyTurn();
        });
    }

    private simulateEnemyTurn(): void {
        const enemyTeam = this.teamPool[(this.selectedTeamIndex + 1) % this.teamPool.length];
        const enemySkill = 0.52 + enemyTeam.rating / 250 + (this.currentMode === "career" ? 0.06 : 0);
        const goal = Math.random() < Math.min(0.88, enemySkill);
        if (goal) {
            this.enemyScore += 1;
        }
        this.enemyShots += 1;
        this.refreshHud();
        this.showToast(goal ? `${enemyTeam.name} 进球` : `${enemyTeam.name} 射偏`, 1100);

        if (this.shouldFinishMatch()) {
            Laya.timer.once(900, this, () => this.finalizeSummary());
            return;
        }

        Laya.timer.once(1000, this, () => {
            this.resetForNextRound();
        });
    }

    private shouldFinishMatch(): boolean {
        if (!this.isSuddenDeath) {
            const playerRemain = this.totalRounds - this.playerShots;
            const enemyRemain = this.totalRounds - this.enemyShots;
            if (this.playerScore > this.enemyScore + Math.max(enemyRemain, 0)) {
                return true;
            }
            if (this.enemyScore > this.playerScore + Math.max(playerRemain, 0)) {
                return true;
            }
            if (this.playerShots >= this.totalRounds && this.enemyShots >= this.totalRounds) {
                if (this.playerScore !== this.enemyScore) {
                    return true;
                }
                this.isSuddenDeath = true;
                this.showToast("进入突然死亡！", 1200);
                return false;
            }
            return false;
        }

        return this.playerShots === this.enemyShots && this.playerScore !== this.enemyScore;
    }

    private finalizeSummary(): void {
        const win = this.playerScore > this.enemyScore;
        const draw = this.playerScore === this.enemyScore;
        this.topScore = Math.max(this.topScore, this.playerScore);
        if (win) {
            this.totalWins += 1;
        }
        this.summary = {
            title: draw ? "平局" : win ? "胜利" : "失败",
            subtitle: draw ? "非常接近，再来一局！" : win ? "更好的射门时机赢下了比赛。" : "下次试试不同射手或角度。",
            playerScore: this.playerScore,
            enemyScore: this.enemyScore,
            totalShots: this.playerShots,
            goals: this.playerScore,
            accuracyRate: this.playerShots > 0 ? Math.round(this.playerScore / this.playerShots * 100) : 0,
            streak: this.bestStreak
        };
        this.saveProgress();
        this.renderResult();
    }

    private resetForNextRound(): void {
        this.isProcessingShot = false;
        this.prepareKeeperRead();
        this.redrawGoalkeeper("#fb7185");
        this.ball!.pos(375, 888);
        this.ball!.scale(1, 1);
        this.ball!.rotation = 0;
        this.goalkeeper!.pos(375, 390);
        this.goalkeeper!.scale(1, 1);
        this.goalkeeper!.rotation = 0;
        this.dragHintLabel!.text = this.isSuddenDeath ? `决胜球：${this.keeperReadText()}` : this.keeperReadText();
        this.refreshHud();
    }

    private refreshHud(): void {
        const roundIndex = Math.min(Math.max(this.playerShots + 1, 1), this.totalRounds);
        if (this.scoreLabel) {
            this.scoreLabel.text = `${this.playerScore} : ${this.enemyScore}`;
        }
        if (this.roundLabel) {
            this.roundLabel.text = this.isSuddenDeath ? "突然死亡" : `第 ${roundIndex} / ${this.totalRounds} 轮`;
        }
        if (this.remainLabel) {
            this.remainLabel.text = this.isSuddenDeath
                ? "下一粒进球可能终结比赛"
                : `玩家剩 ${Math.max(0, this.totalRounds - this.playerShots)} 脚 / 对手剩 ${Math.max(0, this.totalRounds - this.enemyShots)} 脚`;
        }
    }

    private renderResult(): void {
        this.currentScreen = "result";
        this.detachShotInput();
        this.clearContainers();
        this.drawBackdrop("#09111d", "#124e3b");
        this.addTitle("比赛结果", "完整可玩流程已完成");

        const summary = this.summary!;
        const panel = this.createGlassPanel(70, 220, 610, 650, "#071522e8");
        this.ui.overlay!.addChild(panel);
        const card = new Laya.Sprite();
        card.loadImage(Main.shareCardImage);
        card.pos(118, 232);
        card.size(514, 356);
        card.alpha = 0.35;
        this.ui.overlay!.addChild(card);
        this.ui.overlay!.addChild(this.createLabel(summary.title, 375, 296, 56, "#ffffff", true));
        this.ui.overlay!.addChild(this.createLabel(summary.subtitle, 375, 356, 24, "#b6dbff", true));
        this.ui.overlay!.addChild(this.createLabel(`${summary.playerScore} : ${summary.enemyScore}`, 375, 466, 92, "#ffe082", true));

        this.drawSummaryLine("射门", `${summary.totalShots}`, 128, 602);
        this.drawSummaryLine("进球", `${summary.goals}`, 128, 662);
        this.drawSummaryLine("命中率", `${summary.accuracyRate}%`, 128, 722);
        this.drawSummaryLine("最佳连中", `${summary.streak}`, 128, 782);

        const againButton = this.createPrimaryButton("再来一局", 375, 965, 420, 84, "#149c60");
        againButton.on(Laya.Event.CLICK, this, () => this.startMatch());
        const shareButton = this.createPrimaryButton("分享战绩", 375, 1080, 420, 84, "#dd7a1f");
        shareButton.on(Laya.Event.CLICK, this, () => this.mockShare());
        const homeButton = this.createPrimaryButton("返回首页", 375, 1195, 420, 84, "#19446a");
        homeButton.on(Laya.Event.CLICK, this, () => this.renderHome());
        this.ui.overlay!.addChild(againButton);
        this.ui.overlay!.addChild(shareButton);
        this.ui.overlay!.addChild(homeButton);
    }

    private finishMatch(message: string, keepSummary: boolean): void {
        this.detachShotInput();
        if (!keepSummary) {
            this.showToast(message, 900);
            Laya.timer.once(950, this, () => this.renderHome());
        }
    }

    private clearContainers(): void {
        this.ui.bg!.graphics.clear();
        this.ui.field!.removeChildren();
        this.ui.hud!.removeChildren();
        this.ui.overlay!.removeChildren();
        this.dragPreview = null;
        this.dragHintLabel = null;
        this.goalkeeper = null;
        this.ball = null;
        this.scoreLabel = null;
        this.roundLabel = null;
        this.modeLabel = null;
        this.remainLabel = null;
        this.detachShotInput();
        Laya.timer.clearAll(this);
    }

    private drawBackdrop(topColor: string, bottomColor: string, useTeamGradient = false): void {
        const bg = this.ui.bg!;
        bg.graphics.clear();
        bg.graphics.drawRect(0, 0, this.designWidth, this.designHeight, topColor);
        bg.graphics.drawRect(0, 0, this.designWidth, 360, this.withAlpha("#ffffff", 0.05));
        for (let i = 0; i < 12; i++) {
            const alpha = 0.04 + i * 0.012;
            const color = useTeamGradient && i % 2 === 0 ? bottomColor : i % 3 === 0 ? "#51d8ff" : "#ffffff";
            bg.graphics.drawCircle(58 + i * 68, 80 + (i % 5) * 124, 94 + i * 6, this.withAlpha(color, alpha));
        }
        bg.graphics.drawPoly(0, 0, [0, 240, 750, 84, 750, 218, 0, 380], this.withAlpha("#ffffff", 0.035));
        bg.graphics.drawPoly(0, 0, [0, 760, 750, 620, 750, 760, 0, 900], this.withAlpha("#000000", 0.1));
        bg.graphics.drawRect(0, 950, this.designWidth, 384, bottomColor);
        bg.graphics.drawRect(0, 950, this.designWidth, 10, this.withAlpha("#ffffff", 0.08));
    }

    private drawPitch(): void {
        this.ui.bg!.graphics.drawRect(0, 0, this.designWidth, this.designHeight, "#0a1a28");
    }

    private drawStadiumLights(layer: Laya.Sprite): void {
        const lights = new Laya.Sprite();
        lights.graphics.drawPoly(0, 0, [76, 20, 212, 20, 360, 452, 142, 452], this.withAlpha("#fff3b0", 0.1));
        lights.graphics.drawPoly(0, 0, [540, 20, 684, 20, 608, 452, 390, 452], this.withAlpha("#c9f4ff", 0.1));
        for (let i = 0; i < 6; i++) {
            lights.graphics.drawCircle(92 + i * 26, 42, 8, "#fff3b0");
            lights.graphics.drawCircle(552 + i * 26, 42, 8, "#d9f8ff");
        }
        lights.graphics.drawRect(58, 28, 170, 28, this.withAlpha("#ffffff", 0.08));
        lights.graphics.drawRect(522, 28, 176, 28, this.withAlpha("#ffffff", 0.08));
        layer.addChild(lights);
    }

    private addTitle(title: string, subtitle: string): void {
        this.ui.overlay!.addChild(this.createLabel(title, 378, 108, 54, this.withAlpha("#000000", 0.28), true));
        this.ui.overlay!.addChild(this.createLabel(title, 375, 104, 54, "#ffffff", true));
        this.ui.overlay!.addChild(this.createLabel("◆", 160, 108, 24, "#ffd166", true));
        this.ui.overlay!.addChild(this.createLabel("◆", 590, 108, 24, "#84f5b7", true));
        this.ui.overlay!.addChild(this.createLabel(subtitle, 375, 158, 24, "#bad8f9", true));
    }

    private addBackButton(handler: () => void): void {
        const back = this.createButton("返回", 82, 88, 112, 52, "#17324d");
        back.on(Laya.Event.CLICK, this, handler);
        this.ui.overlay!.addChild(back);
    }

    private drawHeroVisual(): void {
        const hero = new Laya.Sprite();
        hero.loadImage(Main.heroImage);
        hero.pos(0, 210);
        hero.size(this.designWidth, 520);
        this.ui.field!.addChild(hero);

        const shade = new Laya.Sprite();
        shade.graphics.drawRect(0, 210, this.designWidth, 520, this.withAlpha("#000000", 0.2));
        shade.graphics.drawRect(0, 210, this.designWidth, 92, this.withAlpha("#ffffff", 0.06));
        shade.graphics.drawPoly(0, 0, [0, 612, 750, 512, 750, 730, 0, 730], this.withAlpha("#061425", 0.48));
        this.ui.field!.addChild(shade);

        const lights = new Laya.Sprite();
        lights.graphics.drawPoly(0, 0, [120, 220, 245, 220, 405, 595, 210, 595], this.withAlpha("#fff7cc", 0.12));
        lights.graphics.drawPoly(0, 0, [505, 220, 635, 220, 535, 595, 360, 595], this.withAlpha("#d9f8ff", 0.11));
        this.ui.field!.addChild(lights);

        const ring = new Laya.Sprite();
        ring.graphics.drawCircle(0, 0, 98, this.withAlpha("#000000", 0.16));
        ring.graphics.drawCircle(0, 0, 88, this.withAlpha("#103657", 0.94));
        ring.graphics.drawCircle(0, 0, 64, this.withAlpha("#ffffff", 0.9));
        ring.graphics.drawCircle(-24, -28, 10, this.withAlpha("#ffffff", 0.7));
        Laya.loader.load(Main.ballImage).then((texture: Laya.Texture) => {
            if (!texture || !ring.parent) {
                return;
            }
            ring.graphics.drawImage(texture, -63, -52, 126, 104);
        });
        ring.pos(375, 380);
        this.ui.overlay!.addChild(ring);
    }

    private drawTeamBadge(x: number, y: number, size: number, team: TeamData): void {
        const badge = new Laya.Sprite();
        badge.graphics.drawCircle(4, 8, size + 8, this.withAlpha("#000000", 0.22));
        badge.graphics.drawCircle(0, 0, size + 4, "#f8fafc");
        badge.graphics.drawCircle(0, 0, size, team.colors[0]);
        badge.graphics.drawCircle(0, 0, size - 16, team.colors[1]);
        badge.graphics.drawCircle(0, 0, size - 38, team.colors[0]);
        badge.graphics.drawCircle(-size * 0.28, -size * 0.32, size * 0.18, this.withAlpha("#ffffff", 0.54));
        badge.pos(x, y);
        this.ui.overlay!.addChild(badge);
        this.ui.overlay!.addChild(this.createLabel(team.code, x, y, Math.max(24, Math.floor(size / 2.1)), "#0b1730", true));
    }

    private drawMiniTeamBadge(x: number, y: number, team: TeamData): void {
        const badge = new Laya.Sprite();
        badge.graphics.drawCircle(2, 4, 29, this.withAlpha("#000000", 0.18));
        badge.graphics.drawCircle(0, 0, 28, "#ffffff");
        badge.graphics.drawCircle(0, 0, 26, team.colors[0]);
        badge.graphics.drawCircle(0, 0, 18, team.colors[1]);
        badge.pos(x, y);
        this.ui.overlay!.addChild(badge);
    }

    private drawStatBar(label: string, value: number, x: number, y: number, color: string): void {
        this.ui.overlay!.addChild(this.createLabel(label, x, y, 26, "#ffffff"));
        const rail = new Laya.Sprite();
        rail.graphics.drawRoundRect(0, 0, 420, 24, 12, 12, 12, 12, this.withAlpha("#000000", 0.22));
        rail.graphics.drawRoundRect(2, 2, 416, 20, 10, 10, 10, 10, "#19324b");
        rail.pos(x + 108, y + 4);
        this.ui.overlay!.addChild(rail);
        const fill = new Laya.Sprite();
        fill.graphics.drawRoundRect(2, 2, Math.max(18, 416 * (value / 100)), 20, 10, 10, 10, 10, color);
        fill.graphics.drawRoundRect(6, 5, Math.max(12, 408 * (value / 100)), 6, 3, 3, 3, 3, this.withAlpha("#ffffff", 0.22));
        fill.pos(x + 108, y + 4);
        this.ui.overlay!.addChild(fill);
        this.ui.overlay!.addChild(this.createLabel(String(value), 614, y, 24, "#d7f8ff", true));
    }

    private redrawGoalkeeper(shirtColor: string): void {
        if (!this.goalkeeper) {
            return;
        }
        this.drawGoalkeeperPose(shirtColor, 0, false);
    }

    private drawGoalkeeperPose(shirtColor: string, direction: number, diving: boolean): void {
        if (!this.goalkeeper) {
            return;
        }
        const lean = diving ? direction * 16 : 0;
        const armReach = diving ? 52 : 28;
        const legSpread = diving ? 26 : 13;
        this.goalkeeper.graphics.clear();
        this.goalkeeper.graphics.drawCircle(lean, -22, 23, "#ffe0bd");
        this.goalkeeper.graphics.drawCircle(lean - 8, -26, 3, "#14213d");
        this.goalkeeper.graphics.drawCircle(lean + 8, -26, 3, "#14213d");
        this.goalkeeper.graphics.drawRect(-28 + lean * 0.45, 2, 56, 76, shirtColor);
        this.goalkeeper.graphics.drawRect(-22 + lean * 0.45, 14, 44, 12, this.withAlpha("#ffffff", 0.22));
        this.goalkeeper.graphics.drawRect(-armReach + lean, 18 - Math.abs(direction) * 12, 28, 18, "#f8fafc");
        this.goalkeeper.graphics.drawRect(armReach - 28 + lean, 18 - Math.abs(direction) * 12, 28, 18, "#f8fafc");
        this.goalkeeper.graphics.drawRect(-legSpread + lean * 0.25, 78, 13, 48, "#102033");
        this.goalkeeper.graphics.drawRect(legSpread - 13 + lean * 0.25, 78, 13, 48, "#102033");
        this.goalkeeper.graphics.drawCircle(-legSpread + 6 + lean * 0.25, 128, 8, "#f8fafc");
        this.goalkeeper.graphics.drawCircle(legSpread - 7 + lean * 0.25, 128, 8, "#f8fafc");
    }

    private animateGoalkeeperDive(shot: ShotResult): void {
        if (!this.goalkeeper) {
            return;
        }
        const direction = shot.diveDirection;
        const targetRotation = direction === 0 ? 0 : direction * 16;
        const settleRotation = direction === 0 ? 0 : direction * 8;
        this.goalkeeper.scale(1, 1);
        this.goalkeeper.rotation = 0;
        this.drawGoalkeeperPose("#fb7185", direction, true);
        Laya.Tween.to(this.goalkeeper, {
            x: shot.keeperTargetX,
            y: shot.keeperTargetY,
            rotation: targetRotation,
            scaleX: direction === 0 ? 1.08 : 1.18,
            scaleY: direction === 0 ? 0.96 : 0.9
        }, 220, null, Laya.Handler.create(this, () => {
            this.drawGoalkeeperPose(shot.isSaved ? "#facc15" : "#fb7185", direction, true);
            Laya.Tween.to(this.goalkeeper!, {
                y: shot.keeperTargetY + (shot.isSaved ? 12 : 24),
                rotation: settleRotation,
                scaleX: direction === 0 ? 1 : 1.08,
                scaleY: 1
            }, 180);
        }));
    }

    private drawTargetZones(): void {
        const target = new Laya.Sprite();
        target.graphics.drawRect(146, 246, 92, 86, this.withAlpha("#ffe066", 0.1));
        target.graphics.drawRect(512, 246, 92, 86, this.withAlpha("#ffe066", 0.1));
        target.graphics.drawRect(306, 260, 138, 98, this.withAlpha("#ffffff", 0.05));
        target.graphics.drawLines(0, 0, [146, 246, 238, 246, 238, 332, 146, 332, 146, 246], this.withAlpha("#ffe066", 0.5), 2);
        target.graphics.drawLines(0, 0, [512, 246, 604, 246, 604, 332, 512, 332, 512, 246], this.withAlpha("#ffe066", 0.5), 2);
        target.graphics.drawLines(0, 0, [306, 260, 444, 260, 444, 358, 306, 358, 306, 260], this.withAlpha("#ffffff", 0.22), 2);
        this.ui.field!.addChild(target);
    }

    private drawPowerMeter(powerFactor: number, quality: ShotResult["quality"]): void {
        const x = 185;
        const y = 1132;
        const width = 380;
        const color = quality === "perfect" ? "#ffe066" : quality === "good" ? "#84f5b7" : quality === "risky" ? "#ff8a65" : "#d7f8ff";
        this.dragPreview!.graphics.drawRoundRect(x, y, width, 18, 9, 9, 9, 9, this.withAlpha("#000000", 0.35));
        this.dragPreview!.graphics.drawRoundRect(x + 106, y + 3, 116, 12, 6, 6, 6, 6, this.withAlpha("#ffe066", 0.34));
        this.dragPreview!.graphics.drawRoundRect(x + 2, y + 2, Math.max(10, (width - 4) * powerFactor), 14, 7, 7, 7, 7, color);
    }

    private prepareKeeperRead(): void {
        const roll = Math.random();
        this.keeperRead = roll < 0.38 ? -1 : roll < 0.76 ? 1 : 0;
    }

    private keeperReadText(): string {
        if (this.keeperRead < 0) {
            return "门将重心偏左，试试打右上角";
        }
        if (this.keeperRead > 0) {
            return "门将重心偏右，试试打左上角";
        }
        return "门将站位居中，角度越刁越安全";
    }

    private getPowerFactor(deltaY: number): number {
        return Math.min(1, Math.max(0.18, -deltaY / 520));
    }

    private getAngleFactor(deltaX: number): number {
        return Math.max(-1, Math.min(1, deltaX / 220));
    }

    private getShotQuality(powerFactor: number, angleFactor: number): ShotResult["quality"] {
        const sweetPower = powerFactor >= 0.58 && powerFactor <= 0.86;
        const goodAngle = Math.abs(angleFactor) >= 0.34 && Math.abs(angleFactor) <= 0.86;
        if (sweetPower && goodAngle) {
            return "perfect";
        }
        if (powerFactor >= 0.42 && powerFactor <= 0.92 && Math.abs(angleFactor) >= 0.18) {
            return "good";
        }
        if (powerFactor > 0.94 || Math.abs(angleFactor) > 0.92 || powerFactor < 0.34) {
            return "risky";
        }
        return "normal";
    }

    private previewShotText(powerFactor: number, angleFactor: number, quality: ShotResult["quality"]): string {
        if (quality === "perfect") {
            return "完美窗口！松手打死角";
        }
        if (powerFactor > 0.94) {
            return "力量过猛，容易飞出";
        }
        if (powerFactor < 0.38) {
            return "力量偏小，容易被扑";
        }
        if (Math.abs(angleFactor) < 0.2) {
            return "角度太正，门将更容易判断";
        }
        return "不错，继续微调角度";
    }

    private shotMessage(isGoal: boolean, isSaved: boolean, isMiss: boolean, quality: ShotResult["quality"], angleFactor: number): string {
        if (isGoal && quality === "perfect") {
            return this.currentStreak > 0 ? `完美死角！连中 ${this.currentStreak + 1}` : "完美死角！";
        }
        if (isGoal) {
            return Math.abs(angleFactor) > 0.55 ? "刁钻进球！" : "进球！";
        }
        if (isSaved) {
            return quality === "normal" ? "角度太正，被扑出！" : "门将神扑！";
        }
        if (isMiss) {
            return quality === "risky" ? "太追求角度，射偏了！" : "射偏了！";
        }
        return "射门完成";
    }

    private drawSummaryLine(label: string, value: string, x: number, y: number): void {
        const row = new Laya.Sprite();
        row.graphics.drawRoundRect(0, 0, 520, 44, 18, 18, 18, 18, this.withAlpha("#ffffff", 0.055));
        row.graphics.drawRect(20, 42, 480, 1, this.withAlpha("#ffffff", 0.08));
        row.pos(x - 18, y - 8);
        this.ui.overlay!.addChild(row);
        this.ui.overlay!.addChild(this.createLabel(label, x, y, 28, "#a8d6ff"));
        this.ui.overlay!.addChild(this.createLabel(value, 590, y, 30, "#ffffff", true));
    }

    private createButton(text: string, x: number, y: number, width: number, height: number, color: string): Laya.Sprite {
        const button = new Laya.Sprite();
        button.size(width, height);
        button.pos(x - width / 2, y - height / 2);
        button.mouseEnabled = true;
        button.graphics.drawRoundRect(3, 5, width - 6, height - 4, 18, 18, 18, 18, this.withAlpha("#000000", 0.2));
        button.graphics.drawRoundRect(0, 0, width, height - 4, 18, 18, 18, 18, color);
        button.graphics.drawRoundRect(3, 3, width - 6, Math.max(12, height * 0.36), 16, 16, 16, 16, this.withAlpha("#ffffff", 0.12));
        const label = this.createLabel(text, width / 2, height / 2, Math.floor(height * 0.34), "#ffffff", true);
        label.bold = true;
        label.mouseEnabled = false;
        button.addChild(label);
        return button;
    }

    private createPrimaryButton(text: string, x: number, y: number, width: number, height: number, color: string): Laya.Sprite {
        const button = this.createButton(text, x, y, width, height, color);
        button.graphics.clear();
        button.graphics.drawRoundRect(6, 10, width - 12, height - 8, 24, 24, 24, 24, this.withAlpha("#000000", 0.22));
        button.graphics.drawRoundRect(0, 0, width, height - 8, 24, 24, 24, 24, color);
        button.graphics.drawRoundRect(6, 6, width - 12, 28, 14, 14, 14, 14, this.withAlpha("#ffffff", 0.18));
        button.graphics.drawRect(28, height - 18, width - 56, 4, this.withAlpha("#ffffff", 0.12));
        return button;
    }

    private createGlassPanel(x: number, y: number, width: number, height: number, color: string): Laya.Sprite {
        const panel = new Laya.Sprite();
        panel.graphics.drawRoundRect(6, 8, width - 12, height - 4, 30, 30, 30, 30, this.withAlpha("#000000", 0.16));
        panel.graphics.drawRoundRect(0, 0, width, height, 30, 30, 30, 30, color);
        panel.graphics.drawRoundRect(2, 2, width - 4, height - 4, 28, 28, 28, 28, this.withAlpha("#ffffff", 0.035));
        panel.graphics.drawRoundRect(3, 3, width - 6, 54, 26, 26, 26, 26, this.withAlpha("#ffffff", 0.07));
        panel.graphics.drawRect(24, height - 16, width - 48, 2, this.withAlpha("#ffffff", 0.08));
        panel.pos(x, y);
        return panel;
    }

    private createInfoLine(title: string, content: string, x: number, y: number): Laya.Text {
        const label = this.createLabel(`${title}: ${content}`, x, y, 22, "#e3f2ff");
        label.width = 520;
        label.wordWrap = true;
        return label;
    }

    private createParagraph(text: string, x: number, y: number, width: number, fontSize = 28): Laya.Text {
        const label = this.createLabel(text, x, y, fontSize, "#d7ecff");
        label.width = width;
        label.wordWrap = true;
        label.leading = 10;
        return label;
    }

    private createLabel(text: string, x: number, y: number, fontSize: number, color: string, centered = false): Laya.Text {
        const label = new Laya.Text();
        label.text = text;
        label.fontSize = fontSize;
        label.color = color;
        label.font = "Microsoft YaHei";
        label.bold = fontSize >= 40;
        label.x = x;
        label.y = y;
        if (centered) {
            label.anchorX = 0.5;
            label.anchorY = 0.5;
            label.align = "center";
            label.valign = "middle";
        }
        return label;
    }

    private difficultyText(level: ShotDifficulty): string {
        if (level === "easy") {
            return "简单门将";
        }
        if (level === "hard") {
            return "困难门将";
        }
        return "普通门将";
    }

    private tierText(tier: PlayerData["tier"]): string {
        if (tier === "Ace") {
            return "王牌";
        }
        if (tier === "Starter") {
            return "主力";
        }
        return "奇兵";
    }

    private getUnlockedTeamCount(): number {
        let count = 0;
        for (const team of this.teamPool) {
            if (team.unlocked) {
                count += 1;
            }
        }
        return count;
    }

    private mockRewardUnlock(team: TeamData): void {
        const tt = this.getDouyinSdk();
        if (tt && typeof tt.createRewardedVideoAd === "function") {
            this.showToast("检测到激励视频 SDK 接口。");
        }
        team.unlocked = true;
        this.saveProgress();
    }

    private mockShare(): void {
        const summary = this.summary;
        const shareText = summary
            ? `世界杯点球大战 ${summary.playerScore}:${summary.enemyScore}，命中率 ${summary.accuracyRate}%`
            : "世界杯点球大战";
        const tt = this.getDouyinSdk();
        if (tt && typeof tt.shareAppMessage === "function") {
            tt.shareAppMessage({
                title: shareText,
                query: "from=score_card"
            });
            return;
        }
        this.showToast("分享卡片已准备好，抖音 SDK 将使用此入口。");
    }

    private loadSave(): void {
        const save = Laya.LocalStorage.getJSON(Main.saveKey) as GameSaveData | null;
        if (!save) {
            this.applyDefaultUnlocks();
            Laya.SoundManager.muted = !this.settings.sound;
            return;
        }

        this.settings.sound = save.settings ? save.settings.sound : true;
        this.settings.vibration = save.settings ? save.settings.vibration : true;
        this.topScore = save.topScore || 0;
        this.totalWins = save.totalWins || 0;
        this.selectedTeamIndex = Math.max(0, Math.min(this.teamPool.length - 1, save.selectedTeamIndex || 0));
        this.selectedPlayerIndex = Math.max(0, Math.min(4, save.selectedPlayerIndex || 0));

        const unlocked = new Set(save.unlockedTeams || []);
        for (const team of this.teamPool) {
            team.unlocked = unlocked.has(team.code);
        }
        this.ensureMinimumUnlockedTeams();
        Laya.SoundManager.muted = !this.settings.sound;
    }

    private saveProgress(): void {
        const unlockedTeams: string[] = [];
        for (const team of this.teamPool) {
            if (team.unlocked) {
                unlockedTeams.push(team.code);
            }
        }
        const save: GameSaveData = {
            unlockedTeams,
            selectedTeamIndex: this.selectedTeamIndex,
            selectedPlayerIndex: this.selectedPlayerIndex,
            settings: {
                sound: this.settings.sound,
                vibration: this.settings.vibration
            },
            topScore: this.topScore,
            totalWins: this.totalWins
        };
        Laya.LocalStorage.setJSON(Main.saveKey, save);
    }

    private resetSave(): void {
        Laya.LocalStorage.removeItem(Main.saveKey);
        this.settings.sound = true;
        this.settings.vibration = true;
        this.topScore = 0;
        this.totalWins = 0;
        this.selectedTeamIndex = 0;
        this.selectedPlayerIndex = 0;
        this.applyDefaultUnlocks();
        Laya.SoundManager.muted = false;
        this.saveProgress();
    }

    private applyDefaultUnlocks(): void {
        for (let i = 0; i < this.teamPool.length; i++) {
            this.teamPool[i].unlocked = i < 8;
        }
    }

    private ensureMinimumUnlockedTeams(): void {
        if (this.getUnlockedTeamCount() === 0) {
            this.applyDefaultUnlocks();
        }
    }

    private triggerVibration(style: "light" | "medium" | "heavy"): void {
        if (!this.settings.vibration) {
            return;
        }
        const tt = this.getDouyinSdk();
        if (tt && typeof tt.vibrateShort === "function") {
            tt.vibrateShort({ type: style });
        }
    }

    private getDouyinSdk(): any {
        const win = Laya.Browser.window as any;
        return win ? win.tt : null;
    }

    private showToast(message: string, duration = 1200): void {
        if (!this.ui.toast) {
            return;
        }
        this.ui.toast.text = message;
        this.ui.toast.visible = true;
        this.ui.toast.alpha = 1;
        Laya.Tween.clearAll(this.ui.toast);
        Laya.Tween.to(this.ui.toast, { alpha: 0 }, 300, null, Laya.Handler.create(this, () => {
            this.ui.toast!.visible = false;
        }), duration);
    }

    private withAlpha(hex: string, alpha: number): string {
        let normalized = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16);
        if (normalized.length < 2) {
            normalized = `0${normalized}`;
        }
        return `${hex}${normalized}`;
    }
}

const bootWhenStageReady = (): void => {
    if (!Laya.stage) {
        setTimeout(bootWhenStageReady, 16);
        return;
    }

    const root = Laya.stage.numChildren > 0 ? Laya.stage.getChildAt(0) : Laya.stage;
    if (root) {
        Main.ensureBoot(root as Laya.Node);
    }
};

setTimeout(bootWhenStageReady, 0);
