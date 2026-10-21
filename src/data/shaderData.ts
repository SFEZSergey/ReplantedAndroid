export interface ShaderPassInfo {
  id: string;
  name: string;
  timeMsPerFrame: number;
  drawsPerFrame: number;
  instructions: number;
  extent: string;
  colors: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  analysis: string[];
  keyFeatures: string[];
  fullSpirvSnippet: string;
}

export const SHADER_PASSES: ShaderPassInfo[] = [
  {
    id: 'pass-80f0021c08000095',
    name: 'Pass 0x95 — Главный фильтр эффектов / размытие',
    timeMsPerFrame: 20.60,
    drawsPerFrame: 44,
    instructions: 4568,
    extent: '3840×2160 (4K UHD)',
    colors: '1 target (color format 37)',
    severity: 'critical',
    summary: 'Критический затор (38% всего времени кадра!). Выполняет 44 прохода отрисовки в 4K с тяжелейшей математикой.',
    analysis: [
      'Потребляет 20.60 мс в каждом кадре при 44 draws на 3840x2160.',
      'Содержит множественные OpGroupNonUniformQuadBroadcast для считывания соседних пикселей в кваде (Adreno Wave4).',
      'Огромная цепочка полиномиальной аппроксимации log2/exp (Fma с коэффициентами -0.125, 0.1428, -0.166, 0.2, -0.25, 0.333) из-за эмуляции точного guest NaN/denormal.',
      'Использует UnpackHalf2x16, UMin, маскирование float, ветвления по 16-битным полу-точностям.',
      'Принудительный TU_DEBUG=sysmem заставляет Adreno сбрасывать весь 4K буфер в оперативную память вместо быстрого кристального GMEM кэша.'
    ],
    keyFeatures: ['OpGroupNonUniformQuadBroadcast', 'UnpackHalf2x16', 'Fma Polynomial Log2', '44 Draws/Frame', '3840×2160'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c08000095.spv)
; Bound: 4568 | OpExecutionMode DepthReplacing
; Capabilities: GroupNonUniform, GroupNonUniformBallot, GroupNonUniformShuffle, GroupNonUniformQuad, ImageQuery
OpEntryPoint Fragment %main "main" %gl_FragCoord %in_param_0 %in_param_1 %gl_BaryCoordKHR %gl_SubgroupInvocationID %gl_FragDepth %out_mrt_0
...
%1186 = OpExtInst %float %549 Fma %float_n0_125 %1183 %float_0_142857149
%1188 = OpExtInst %float %549 Fma %1186 %1183 %float_n0_166666672
%1190 = OpExtInst %float %549 Fma %1188 %1183 %float_0_200000003
...
%1003 = OpGroupNonUniformQuadBroadcast %uint %uint_3 %990 %uint_0
%1026 = OpGroupNonUniformQuadBroadcast %uint %uint_3 %995 %uint_0`
  },
  {
    id: 'pass-80f0021c0800009b',
    name: 'Pass 0x9b — Интерполяция и сэмплирование интерфейса',
    timeMsPerFrame: 11.07,
    drawsPerFrame: 35,
    instructions: 1848,
    extent: '3840×2160 (4K UHD)',
    colors: '1 target',
    severity: 'high',
    summary: 'Второй по тяжести шейдер (20% времени кадра). 35 проходов сэмплирования текстур по 2D сетке.',
    analysis: [
      'Потребляет 11.07 мс на кадр при 35 draws.',
      'Множественные чтения 2D текстур (OpImageSampleExplicitLod) и проверка границ с вычислением обратного квадратного корня InverseSqrt.',
      'Масштабирование кадра: перерасчёт относительных координат интерфейса под 3840x2160.',
      'В паре с Pass 0x95 они вдвоём занимают более 31.6 мс — что само по себе ограничивает ФПС потолком в 31 кадр/с!'
    ],
    keyFeatures: ['OpImageSampleExplicitLod', 'InverseSqrt', '35 Draws/Frame', '3840×2160'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c0800009b.spv)
; Bound: 1848 | OpExecutionMode DepthReplacing
; Capabilities: Shader, GroupNonUniform, GroupNonUniformBallot, ImageQuery, Int64
%487 = OpExtInst %float %261 InverseSqrt %486
%1041 = OpSampledImage %1042 %1036 %1040
%1043 = OpImageSampleExplicitLod %v4float %1041 %1033 Lod %float_0`
  },
  {
    id: 'pass-80f0021c08000086',
    name: 'Pass 0x86 (Цветной) — Базовый рендер спрайтов и буферов',
    timeMsPerFrame: 4.27,
    drawsPerFrame: 18,
    instructions: 533,
    extent: '3840×2160 (4K UHD)',
    colors: '1 target (color format 37), blend on',
    severity: 'medium',
    summary: 'Рендеринг игровых элементов и спрайтов с включённым блендингом.',
    analysis: [
      'Занимает 4.27 мс при 18 вызовах отрисовки.',
      'Использует чтение StorageBuffer (%buffers) с упаковкой UnpackHalf2x16 и записью FragDepth.',
      'Отрисовывается с альфа-блендингом.'
    ],
    keyFeatures: ['StorageBuffer', 'UnpackHalf2x16', 'FragDepth Replacing', 'Blend On'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c08000086.spv)
; Bound: 533 | DepthReplacing
%110 = OpAccessChain %_ptr_StorageBuffer__struct_20 %buffers %uint_0
%336 = OpExtInst %v2float %71 UnpackHalf2x16 %335
OpStore %out_mrt_0 %344`
  },
  {
    id: 'pass-80f0021c08000097',
    name: 'Pass 0x97 — Комплексный мульти-текстурный шейдер',
    timeMsPerFrame: 3.68,
    drawsPerFrame: 1,
    instructions: 7672,
    extent: '3840×2160 (4K UHD)',
    colors: '1 target',
    severity: 'medium',
    summary: 'Огромный монолитный шейдер (7672 инструкции!). Всего 1 вызов, но занимает 3.68 мс из-за размера.',
    analysis: [
      'Содержит 7672 инструкции в SPIR-V — самый длинный шейдер в компиляции.',
      'Сэмплирует сразу 3 различных изображения (%image_3) и считывает uniform SRT буфер (%flattened_srt).',
      'Включает барицентрические координаты (%gl_BaryCoordKHR) и вычисления перспективы.',
      'Оптимизируется флагом APS5_HOST_FMA=1 (склейка сотен FAdd/FMul в аппаратно ускоренный mad).'
    ],
    keyFeatures: ['7672 Instructions', 'gl_BaryCoordKHR', 'Multi-Image Sampler', 'SRT UBO'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c08000097.spv)
; Bound: 7672 | Instructions: 7672 | EarlyFragmentTests
%image_3 = OpVariable %_ptr_UniformConstant__arr_38_uint_3_0 UniformConstant
%flattened_srt = OpVariable %_ptr_StorageBuffer__struct_28 StorageBuffer
...
%6211 = OpExtInst %float %559 Fma %float_0_166666672 %6210 %float_1`
  },
  {
    id: 'pass-80f0021c00000086',
    name: 'Pass 0x86 (Clear/Depth) — Проход глубины и масок',
    timeMsPerFrame: 3.56,
    drawsPerFrame: 20,
    instructions: 533,
    extent: '3840×2160 (4K UHD)',
    colors: '0 targets (только Z/Depth)',
    severity: 'medium',
    summary: '20 вызовов отрисовки только по буферу глубины (Z-pass / маска отсечения).',
    analysis: [
      'Занимает 3.56 мс на кадр.',
      'Не выводит цвет (c0), только пишет gl_FragDepth.',
      'В режиме sysmem запись буфера глубины 4K в память смартфона создает лишние гигабайты трафика.'
    ],
    keyFeatures: ['Depth-Only (c0)', '20 Draws/Frame', 'Z-Prepass'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c00000086.spv)
; Bound: 533 | DepthReplacing
OpExecutionMode %main DepthReplacing
OpStore %gl_FragDepth %328`
  },
  {
    id: 'pass-80f0021c08000087',
    name: 'Pass 0x87 — Текстурная сетка и атласы шрифтов',
    timeMsPerFrame: 1.34,
    drawsPerFrame: 2,
    instructions: 1121,
    extent: '3840×2160 (4K UHD)',
    colors: '1 target, blend off',
    severity: 'low',
    summary: 'Отрисовка атласов (шрифты, интерфейс) с явным уровнем детализации (LOD).',
    analysis: [
      'Занимает 1.34 мс на кадр при 2 draws.',
      'Использует OpImageSampleExplicitLod с ручным вычислением координат UV.'
    ],
    keyFeatures: ['OpImageSampleExplicitLod', 'UnpackHalf2x16', '1121 Instructions'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c08000087.spv)
; Bound: 1121 | EarlyFragmentTests
%482 = OpImageSampleExplicitLod %v4float %480 %469 Lod %471
%928 = OpExtInstImport "GLSL.std.450"`
  },
  {
    id: 'pass-80f0021c0800009f',
    name: 'Pass 0x9f — Маска радиального затухания / виньетка',
    timeMsPerFrame: 0.03,
    drawsPerFrame: 0,
    instructions: 444,
    extent: '3840×2160 (4K UHD)',
    colors: '1 target',
    severity: 'low',
    summary: 'Быстрый проход аналитического шейдера (квадрат расстояния от центра, виньетка).',
    analysis: ['Очень легкий проход, выполняется практически мгновенно (0.03 мс).'],
    keyFeatures: ['444 Instructions', 'Distance Sqrt', 'Fast'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c0800009f.spv)
; Bound: 444 | EarlyFragmentTests
%52 = OpExtInst %float %53 Sqrt %51`
  },
  {
    id: 'pass-80f0021c0800008e',
    name: 'Pass 0x8e — Редкий проход интерполяции 1D/2D',
    timeMsPerFrame: 0.01,
    drawsPerFrame: 0,
    instructions: 970,
    extent: '3840×2160 (4K UHD)',
    colors: '1 target',
    severity: 'low',
    summary: 'Редкий проход, почти не нагружает GPU в текущей сцене.',
    analysis: ['Вызывается реже одного раза за 3 кадра, влияние на ФПС нулевое.'],
    keyFeatures: ['Sampled1D', 'SubgroupBallot'],
    fullSpirvSnippet: `; SPIR-V (pass-80f0021c0800008e.spv)
; Bound: 970 | EarlyFragmentTests`
  }
];
