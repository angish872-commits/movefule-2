package com.movefuel.mufil2.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelRadius
import com.movefuel.mufil2.ui.design.MoveFuelSpacing

@Composable
fun MFCard(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(MoveFuelSpacing.Base),
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(MoveFuelRadius.Card)
    Column(
        modifier
            .shadow(
                elevation = 12.dp,
                shape = shape,
                ambientColor = MoveFuelColors.Sage.copy(alpha = .05f),
                spotColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = .42f),
            )
            .clip(shape)
            .background(
                Brush.linearGradient(
                    listOf(
                        MoveFuelColors.Surface2.copy(alpha = .98f),
                        MoveFuelColors.Surface.copy(alpha = .96f),
                    )
                )
            )
            .border(BorderStroke(1.dp, MoveFuelColors.Border.copy(alpha = .88f)), shape)
            .animateContentSize()
            .padding(contentPadding),
        content = content,
    )
}
