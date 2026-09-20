package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB018TargetReviewAndFinishScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_018",
        title = "Target Review and Finish",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_017,
        onNavigate = onNavigate,
    ) {
            MFMacroBars()
            MFNotice("Review before continuing", "Everything remains editable later in Profile.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB018TargetReviewAndFinishScreenPreview() {
    MoveFuelTheme { ONB018TargetReviewAndFinishScreen {} }
}
