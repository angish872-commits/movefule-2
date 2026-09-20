package com.movefuel.mufil2.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.MoveFuelColors

@Composable
fun MFSkeleton(
    width: Dp,
    height: Dp,
    modifier: Modifier = Modifier,
) {
    val transition = rememberInfiniteTransition(label = "mfShimmer")
    val x by transition.animateFloat(
        initialValue = -420f,
        targetValue = 980f,
        animationSpec = infiniteRepeatable(
            animation = tween(1450, easing = LinearEasing),
        ),
        label = "mfShimmerX",
    )
    val brush = Brush.linearGradient(
        colors = listOf(
            MoveFuelColors.Surface3.copy(alpha = .74f),
            MoveFuelColors.Sage.copy(alpha = .15f),
            MoveFuelColors.Surface3.copy(alpha = .74f),
        ),
        start = Offset(x, 0f),
        end = Offset(x + 340f, 280f),
    )
    Box(
        modifier
            .width(width)
            .height(height)
            .background(brush, RoundedCornerShape(14.dp))
    )
}
