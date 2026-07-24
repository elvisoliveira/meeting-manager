const MARGIN = 6;
const VIEWPORT_PAD = 4;

export default class Tooltip {
    constructor() {
        this.current = null;
        this.el = document.createElement('div');
        this.el.className = 'mm-tooltip';
        this.el.setAttribute('role', 'tooltip');
        this.el.style.display = 'none';
        document.body.appendChild(this.el);

        const enter = this.handleEnter.bind(this);
        const leave = this.handleLeave.bind(this);
        const dismiss = () => this.hide();

        document.addEventListener('mouseover', enter);
        document.addEventListener('mouseout', leave);
        document.addEventListener('focusin', enter);
        document.addEventListener('focusout', leave);
        document.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    }

    handleEnter(e) {
        const target = e.target.closest && e.target.closest('[data-tip]');
        if (!target || target === this.current) return;
        const content = target.getAttribute('data-tip');
        if (!content || !content.trim()) return;
        this.show(target, content);
    }

    handleLeave(e) {
        if (!this.current) return;
        const next = e.relatedTarget;
        if (next && this.current.contains(next)) return;
        const stillOnTrigger = next && next.closest && next.closest('[data-tip]') === this.current;
        if (stillOnTrigger) return;
        this.hide();
    }

    show(target, content) {
        this.current = target;
        this.el.innerHTML = content;
        this.el.style.display = 'block';
        this.position(target);
    }

    hide() {
        this.current = null;
        this.el.style.display = 'none';
    }

    position(target) {
        const rect = target.getBoundingClientRect();
        const requested = target.getAttribute('data-tip-placement') || 'top';
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const place = (placement) => {
            const tip = this.el.getBoundingClientRect();
            let top, left;
            switch (placement) {
                case 'bottom':
                    top = rect.bottom + MARGIN;
                    left = rect.left + (rect.width - tip.width) / 2;
                    break;
                case 'left':
                    top = rect.top + (rect.height - tip.height) / 2;
                    left = rect.left - tip.width - MARGIN;
                    break;
                case 'right':
                    top = rect.top + (rect.height - tip.height) / 2;
                    left = rect.right + MARGIN;
                    break;
                default:
                    top = rect.top - tip.height - MARGIN;
                    left = rect.left + (rect.width - tip.width) / 2;
            }
            return { top, left, tip, placement };
        };

        const fits = (p) =>
            p.top >= VIEWPORT_PAD &&
            p.left >= VIEWPORT_PAD &&
            p.top + p.tip.height <= vh - VIEWPORT_PAD &&
            p.left + p.tip.width <= vw - VIEWPORT_PAD;

        const flipMap = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
        let pos = place(requested);
        if (!fits(pos)) {
            const flipped = place(flipMap[requested]);
            if (fits(flipped)) pos = flipped;
        }

        pos.left = Math.max(VIEWPORT_PAD, Math.min(pos.left, vw - pos.tip.width - VIEWPORT_PAD));
        pos.top = Math.max(VIEWPORT_PAD, Math.min(pos.top, vh - pos.tip.height - VIEWPORT_PAD));

        this.el.style.top = `${pos.top}px`;
        this.el.style.left = `${pos.left}px`;
    }
}
