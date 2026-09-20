package com.movefuel.mufil2.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelMotion

@Composable
fun MFTrendGraph(
    points: List<Float>,
    modifier: Modifier = Modifier,
) {
    val reveal = remember { Animatable(0f) }
    LaunchedEffect(points) {
        reveal.snapTo(0f)
        reveal.animateTo(1f, animationSpec = MoveFuelMotion.data())
    }
    Canvas(modifier.fillMaxWidth().height(180.dp)) {
        repeat(4) { i ->
            val y = size.height * i / 3f
            drawLine(
                color = MoveFuelColors.Border.copy(alpha = .52f),
                start = Offset(0f, y),
                end = Offset(size.width, y),
                strokeWidth = 1.dp.toPx(),
            )
        }
        if (points.size < 2) return@Canvas
        val min = points.minOrNull() ?: 0f
        val max = points.maxOrNull() ?: 1f
        val range = (max - min).takeIf { it > 0f } ?: 1f
        val visibleCount = ((points.size - 1) * reveal.value).toInt().coerceAtLeast(1)
        val stepX = size.width / (points.size - 1)
        val path = Path()
        points.forEachIndexed { index, value ->
            if (index > visibleCount) return@forEachIndexed
            val x = index * stepX
            val normalized = (value - min) / range
            val y = size.height - normalized * size.height
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        drawPath(
            path,
            MoveFuelColors.ProgressAccent,
            style = Stroke(width = 4.dp.toPx()),
        )
        points.forEachIndexed { index, value ->
            if (index > visibleCount) return@forEachIndexed
            val x = index * stepX
            val normalized = (value - min) / range
            val y = size.height - normalized * size.height
            drawCircle(MoveFuelColors.Sage, radius = 4.dp.toPx(), center = Offset(x, y))
        }
    }
}
