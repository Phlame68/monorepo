import { API_URL, AUTH_URL, NODE_ENV, WIDGET_URL } from '@thxnetwork/api/config/secrets';
import BrandService from '@thxnetwork/api/services/BrandService';
import PoolService from '@thxnetwork/api/services/PoolService';
import { ReferralReward } from '@thxnetwork/api/models/ReferralReward';
import { Widget } from '@thxnetwork/api/models/Widget';
import { NotFoundError } from '@thxnetwork/api/util/errors';
import { Request, Response } from 'express';
import { param } from 'express-validator';
import { minify } from 'terser';
import { runMilestoneRewardWebhook, runReferralRewardWebhook } from '@thxnetwork/api/services/THXService';

const validation = [param('id').isMongoId()];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['Widget']
    const referralRewards = await ReferralReward.find({
        poolId: req.params.id,
    });
    const refs = JSON.stringify(
        referralRewards
            .filter((r) => r.successUrl)
            .map((r) => {
                return {
                    uuid: r.uuid,
                    successUrl: r.successUrl,
                };
            }),
    );

    const pool = await PoolService.getById(req.params.id);
    if (!pool) throw new NotFoundError('Pool not found.');

    const expired = pool.settings.endDate ? pool.settings.endDate.getTime() <= Date.now() : false;
    const brand = await BrandService.get(pool._id);
    const widget = await Widget.findOne({ poolId: req.params.id });
    const origin = new URL(req.header('Referrer')).origin;
    const widgetOrigin = new URL(widget.domain).origin;

    // Set active to true if there is a request made from the configured domain
    if (widgetOrigin === origin && !widget.active) {
        await widget.updateOne({ active: true });

        runReferralRewardWebhook(pool, { origin });
        runMilestoneRewardWebhook(pool);
    }

    const data = `
    class THXWidget {
        MD_BREAKPOINT = 990;
        defaultStyles = {
            sm: {
                width: '100%',
                height: '100%',
                maxHeight: 'none',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 0,
            },
            md: {
                top: 'auto',
                bottom: '100px',
                maxHeight: '680px',
                width: '400px',
                borderRadius: '10px',
                height: 'calc(100% - 115px)',
            },
        };
    
        constructor(settings) {
            this.settings = settings;
            this.theme = JSON.parse(settings.theme);
            this.init();
        }

        init() {
            const waitForBody = () => new Promise((resolve) => {
                const tick = () => {
                    if (document.getElementsByTagName('body').length) {
                        clearInterval(timer)
                        resolve()
                    }
                }
                const timer = setInterval(tick, 1000);
            });
            waitForBody().then(this.onLoad.bind(this));
        }

        onLoad() {
            this.iframe = this.createIframe();
            this.notifications = this.createNotifications(0);
            this.message = this.createMessage();
            this.launcher = this.createLauncher();
            this.referrals = JSON.parse(this.settings.refs).filter((r) => r.successUrl);
            this.container = this.createContainer(this.iframe, this.launcher, this.message);
            this.parseURL();
            
            this.onWidgetToggle(!!this.widgetPath)
            
            window.matchMedia('(max-width: 990px)').addListener(this.onMatchMedia.bind(this));
            window.onmessage = this.onMessage.bind(this);
        }

        parseURL() {
            const url = new URL(window.location.href)
            const ref = url.searchParams.get('ref');
            if (!ref) return;
            
            this.ref = ref;
            
            const { uuid } = JSON.parse(atob(this.ref));
            const referral = this.referrals.find((r) => r.uuid === uuid);
            if (!referral) return;
            
            this.successUrl = referral.successUrl;
        }

        storeReferrer() {    
            this.timer = window.setInterval(this.onMatchSuccessUrl.bind(this), 500);
            if (this.ref) this.iframe.contentWindow.postMessage({ message: 'thx.config.ref', ref: this.ref }, this.settings.widgetUrl);
        }
    
        get isSmallMedia() {
            const getWidth = () => window.innerWidth;
            return getWidth() < this.MD_BREAKPOINT;
        }

        createURL() {
            const parentUrl = new URL(window.location.href)
            const path = parentUrl.searchParams.get('thx_widget_path');
            const { widgetUrl, poolId, chainId, origin, theme, expired, logoUrl, title } = this.settings;
            const url = new URL(widgetUrl);

            if (path) {
                url.pathname = this.widgetPath = '/' + poolId + path;
            }
            
            url.searchParams.append('id', poolId);
            url.searchParams.append('origin', origin);
            url.searchParams.append('chainId', chainId);
            url.searchParams.append('theme', theme);
            url.searchParams.append('logoUrl', logoUrl);
            url.searchParams.append('title', title);
            url.searchParams.append('expired', expired);
            
            return url;
        }

        createIframe() {
            const { widgetUrl, poolId, chainId, origin, theme, align, expired } = this.settings;
            const iframe = document.createElement('iframe');
            const styles = this.isSmallMedia ? this.defaultStyles['sm'] : this.defaultStyles['md'];
            const url = this.createURL();

            iframe.id = 'thx-iframe';
            iframe.src = url;
            iframe.setAttribute('data-hj-allow-iframe', true);
            Object.assign(iframe.style, {
                ...styles,
                zIndex: 99999999,
                display: 'flex',
                right: !this.isSmallMedia && align === 'right' ? '15px' : 'auto',
                left: !this.isSmallMedia && align === 'left' ? '15px' : 'auto',
                position: 'fixed',
                border: '0',
                opacity: '0',
                boxShadow: 'rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px',
                transform: 'scale(0)',
                transformOrigin: align === 'right' ? 'bottom right' : 'bottom left',
                transition: '.2s opacity ease, .1s transform ease',
            });
    
            return iframe;
        }
    
        createNotifications(counter) {
            const notifications = document.createElement('div');
            notifications.id = 'thx-notifications';
            Object.assign(notifications.style, {
                display: 'none',
                fontFamily: 'Arial',
                fontSize: '13px',
                justifyContent: 'center',
                alignItems: 'center',
                width: '20px',
                height: '20px',
                color: '#FFFFFF',
                position: 'absolute',
                backgroundColor: '#CA0000',
                borderRadius: '50%',
                userSelect: 'none',
            });
            notifications.innerHTML = counter;
    
            return notifications;
        }

        createMessage() {
            const { message, logoUrl, align } = this.settings;
            const messageBox = document.createElement('div');
            const logoBox = document.createElement('div');
            const closeBox = document.createElement('button');

            messageBox.id = 'thx-message';
            
            closeBox.innerHTML = '&times;';             
            
            Object.assign(logoBox.style, {
                zIndex: '0',
                display: 'block',
                backgroundColor: '#FFFFFF',
                backgroundImage: 'url(' + logoUrl + ')',
                width: '40px',
                height: '40px',
                top: '-20px',
                position: 'absolute',
                borderRadius: '50%',
                backgroundSize: '40px auto',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
            });

            Object.assign(closeBox.style, {
                display: 'flex',
                fontFamily: 'Arial',
                fontSize: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                width: '20px',
                height: '20px',
                border: '0',
                color: '#000000',
                position: 'absolute',
                backgroundColor: 'transparent',
                top: '0',
                right: '0',
                opacity: '0.5',
                transform: 'scale(.9)',
                transition: '.2s opacity ease, .1s transform ease',
            });
            closeBox.addEventListener('mouseenter', () => {
                closeBox.style.opacity = '1';
                closeBox.style.transform = 'scale(1)';
            });
            closeBox.addEventListener('mouseleave', () => {
                closeBox.style.opacity = '.5';
                closeBox.style.transform = 'scale(.9)';
            });
            closeBox.addEventListener('click', () => {
                this.message.remove();
            });
            
            Object.assign(messageBox.style, {
                zIndex: 9999999,
                display: message ? 'flex' : 'none',
                lineHeight: 1.5,
                fontSize: '13px',
                justifyContent: 'center',
                alignItems: 'center',
                width: '200px',
                color: '#000000',
                position: 'fixed',
                backgroundColor: '#FFFFFF',
                borderRadius: '5px',
                userSelect: 'none',
                padding: '15px 10px 10px',
                bottom: '90px',
                right: align === 'right' ? '15px' : 'auto',
                left: align === 'left' ? '15px' : 'auto',
                boxShadow: 'rgb(50 50 93 / 25%) 0px 50px 100px -20px, rgb(0 0 0 / 30%) 0px 30px 60px -30px',
                opacity: 0,
                transform: 'scale(0)',
                transition: '.2s opacity ease, .1s transform ease',
            });

            const wrapper = document.createElement('span');
            wrapper.style.zIndex = 0;
            wrapper.innerHTML = message;
            messageBox.appendChild(wrapper);
            messageBox.appendChild(closeBox);
            messageBox.prepend(logoBox);

                
            return messageBox;
        }
    
        createLauncher() {
            const svgGift = this.settings.iconImg 
                ? '<img id="thx-svg-icon" style="display:block; margin: auto;" width="40" height="40" src="' + this.settings.iconImg + '" alt="Widget launcher icon" />'
                : '<svg id="thx-svg-icon" style="display:block; margin: auto; fill: '+this.theme.elements.launcherIcon.color+'; width: 20px; height: 20px; transform: scale(1); transition: transform .2s ease;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M32 448c0 17.7 14.3 32 32 32h160V320H32v128zm256 32h160c17.7 0 32-14.3 32-32V320H288v160zm192-320h-42.1c6.2-12.1 10.1-25.5 10.1-40 0-48.5-39.5-88-88-88-41.6 0-68.5 21.3-103 68.3-34.5-47-61.4-68.3-103-68.3-48.5 0-88 39.5-88 88 0 14.5 3.8 27.9 10.1 40H32c-17.7 0-32 14.3-32 32v80c0 8.8 7.2 16 16 16h480c8.8 0 16-7.2 16-16v-80c0-17.7-14.3-32-32-32zm-326.1 0c-22.1 0-40-17.9-40-40s17.9-40 40-40c19.9 0 34.6 3.3 86.1 80h-86.1zm206.1 0h-86.1c51.4-76.5 65.7-80 86.1-80 22.1 0 40 17.9 40 40s-17.9 40-40 40z"/></svg>';
            const launcher = document.createElement('div');
            launcher.id = 'thx-launcher';
            Object.assign(launcher.style, {
                zIndex: 9999999,
                display: 'flex',
                width: '60px',
                height: '60px',
                backgroundColor: this.theme.elements.launcherBg.color,
                borderRadius: '50%',
                cursor: 'pointer',
                position: 'fixed',
                bottom: '15px',
                right: this.settings.align === 'right' ? '15px' : 'auto',
                left: this.settings.align === 'left' ? '15px' : 'auto',
                opacity: 0,
                transform: 'scale(0)',
                transition: '.2s opacity ease, .1s transform ease',
            });
            launcher.innerHTML = svgGift;
            launcher.addEventListener('click', this.onClickLauncher.bind(this));
            launcher.addEventListener('mouseenter', this.onMouseEnterLauncher.bind(this));
            launcher.addEventListener('mouseleave', this.onMouseLeaveLauncher.bind(this));
            launcher.appendChild(this.notifications);
            
            setTimeout(() => {
                launcher.style.opacity = 1;
                launcher.style.transform = 'scale(1)';

                this.message.style.opacity = 1;
                this.message.style.transform = 'scale(1)';

                const url = new URL(window.location.href)
                const widgetPath = url.searchParams.get('thx_widget_path');
                this.onWidgetToggle(!!widgetPath)
            }, 350);
    
            return launcher;
        }
    
        createContainer(iframe, launcher, message) {
            const container = document.createElement('div');
            container.id = 'thx-container';
            container.appendChild(iframe);
            container.appendChild(launcher);
            container.appendChild(message);
    
            document.body.appendChild(container);
    
            return container;
        }
        
        onMessage(event) {
            if (!this.settings.widgetUrl || event.origin !== this.settings.widgetUrl) return;
            const { message, amount } = event.data;
            switch (message) {
                case 'thx.widget.ready':{
                    this.onWidgetReady();
                    break
                }
                case 'thx.reward.amount': {
                    this.notifications.innerText = amount;
                    this.notifications.style.display = amount ? 'flex' : 'none';
                    break;
                }
                case 'thx.widget.toggle': {
                    this.onWidgetToggle(!Number(this.iframe.style.opacity));
                    break;
                }
            }
        }

        onMouseEnterLauncher() {
            const gift = document.getElementById('thx-svg-icon');
            gift.style.transform = 'scale(1.1)';    
        }

        onMouseLeaveLauncher() {
            const gift = document.getElementById('thx-svg-icon');
            gift.style.transform = 'scale(1)';
        }

        onClickLauncher() {
            const isMobile = window.matchMedia('(pointer:coarse)').matches;
            if (window.ethereum && isMobile) {
                const deeplink = 'https://metamask.app.link/dapp/';
                const ua = navigator.userAgent.toLowerCase();
                const isAndroid = ua.indexOf("android") > -1;
                const url = isAndroid ? deeplink + this.createURL() : this.createURL();
                
                window.open(url, '_blank');
            } else {
                this.onWidgetToggle(!Number(this.iframe.style.opacity));
                this.message.remove();
            }
        }
    
        onWidgetReady() {      
            const parentUrl = new URL(window.location.href)
            const widgetPath = parentUrl.searchParams.get('thx_widget_path');
            const redirectStatus = parentUrl.searchParams.get('redirect_status');
            
            if (widgetPath) {
                const { widgetUrl, poolId, origin, chainId, theme } = this.settings;
                const path = '/' + poolId + widgetPath;
                const url = new URL(widgetUrl + path);

                url.searchParams.append('id', poolId);
                url.searchParams.append('origin', origin);
                url.searchParams.append('chainId', chainId);
                url.searchParams.append('theme', theme);
                url.searchParams.append('status', redirectStatus);
                
                this.iframe.contentWindow.postMessage({ message: 'thx.iframe.navigate', path: url.pathname + url.search }, widgetUrl);
            }
    
            this.storeReferrer();
        }

        onWidgetToggle(show) {
            this.iframe.style.opacity = show ? '1' : '0';
            this.iframe.style.transform = show ? 'scale(1)' : 'scale(0)';
            this.iframe.contentWindow.postMessage({ message: 'thx.iframe.show', isShown: show }, this.settings.widgetUrl);
        }

        onMatchSuccessUrl() {
            for (const ref of this.referrals) {
                if (window.location.href !== ref.successUrl) continue;

                this.iframe.contentWindow.postMessage({ message: 'thx.referral.claim.create', uuid: ref.uuid, }, this.settings.widgetUrl);

                const index = this.referrals.findIndex((r) => ref.uuid);
                this.referrals.splice(index, 1);
            }
            
            if (!this.referrals.length) {
                window.clearInterval(this.timer);
            }
        }
    
        onMatchMedia(x) {
            if (x.matches) {
                const iframe = document.getElementById('thx-iframe');
                Object.assign(iframe.style, this.defaultStyles['sm']);
            } else {
                const iframe = document.getElementById('thx-iframe');
                Object.assign(iframe.style, this.defaultStyles['md']);
            }
        }
    }
    
    window.THXWidget = new THXWidget({
        apiUrl: '${API_URL}',
        widgetUrl: '${WIDGET_URL}',
        poolId: '${req.params.id}',
        chainId: '${pool.chainId}',
        title: '${pool.settings.title}',
        logoUrl: '${brand && brand.logoImgUrl ? brand.logoImgUrl : AUTH_URL + '/img/logo-padding.png'}',
        iconImg: '${widget.iconImg || ''}',
        message: '${widget.message || ''}',
        align: '${widget.align || 'right'}',
        theme: '${widget.theme}',
        origin: '${origin}',
        refs: ${JSON.stringify(refs)},
        expired: '${expired}'
    });
`;
    const result = await minify(data, {
        mangle: { toplevel: false },
        sourceMap: NODE_ENV !== 'production',
    });

    res.set({ 'Content-Type': 'application/javascript' }).send(result.code);
};

export default { controller, validation };
