import Phaser from 'phaser';

type Config = {
  size: number
  color: number
};

export class OutlineShader extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _size: number;

  private _color: Phaser.Display.Color;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'OutlineShader',
      renderTarget: true,
      fragShader: `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        #define highmedp highp
        #else
        #define highmedp mediump
        #endif
        precision highmedp float;
        uniform sampler2D uMainSampler; 
        varying vec2 outTexCoord;
        uniform vec2 texSize;
        uniform float thickness;
        uniform vec3 outlineColor;
        const float DOUBLE_PI = 3.14159265358979323846264 * 2.;
        void main() {
          vec4 front = texture2D(uMainSampler, outTexCoord);
          if (thickness > 0.0) {
            vec2 mag = vec2(thickness/texSize.x, thickness/texSize.y);
            vec4 curColor;
            float maxAlpha = front.a;
            vec2 offset;
            for (float angle = 0.; angle < DOUBLE_PI; angle += 0.6283185) {
                offset = vec2(mag.x * cos(angle), mag.y * sin(angle));        
                curColor = texture2D(uMainSampler, outTexCoord + offset);
                maxAlpha = max(maxAlpha, curColor.a);
            }
            vec3 resultColor = front.rgb + (outlineColor.rgb * (1. - front.a)) * maxAlpha;
            gl_FragColor = vec4(resultColor, maxAlpha);
          } else {
            gl_FragColor = front;
          }
        }
      `,
    });

    this.setConfig({
      size: 1.0,
      color: 0xffffff,
    });
  }

  onPreRender() {
    this.set1f('thickness', this._size);
    this.set3f('outlineColor', this._color.redGL, this._color.greenGL, this._color.blueGL);
    this.set2f('texSize', this.renderer.width, this.renderer.height);
  }

  setConfig({ size, color }: Config) {
    this._size = size;
    this._color = new Phaser.Display.Color();
    this._color.setFromRGB(Phaser.Display.Color.IntegerToRGB(color));
  }
}
