package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS018ConflictReviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_018",
        title = "Conflict Review",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_019,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_017,
        onNavigate = onNavigate,
    ) {
            MFNotice("Conflict detected","The same item changed elsewhere. Review both versions before choosing.")
            MFListItem("This device","Edited 19:12","Review")
            MFListItem("Other device","Edited 19:13","Review")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS018ConflictReviewScreenPreview() {
    MoveFuelTheme { SYS018ConflictReviewScreen {} }
}
